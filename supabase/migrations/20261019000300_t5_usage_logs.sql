-- ============================================================
-- 家庭药箱 · T5：服药记录 + 库存扣减 + 最近服药时间
-- 执行：Supabase Dashboard → SQL Editor → 粘贴整段 → Run
-- 幂等：可重复执行
-- ============================================================

-- ------------------------------------------------------------
-- 1. 服药记录表
--    box_id 冗余存一份：让 RLS 不必 join medicines，避免策略递归与慢查询
--    quantity_deducted：本次实际扣减量（库存为 0 时是 0），用于撤销时回补
-- ------------------------------------------------------------
create table if not exists public.medicine_usage_logs (
  id                uuid primary key default gen_random_uuid(),
  box_id            uuid          not null references public.medicine_boxes (id),
  medicine_id       uuid          not null references public.medicines (id),
  user_id           uuid          not null default auth.uid() references public.profiles (id),
  taken_at          timestamptz   not null default now(),
  dosage_amount     numeric(10,2) not null default 1,
  quantity_deducted numeric(10,2) not null default 0,
  note              text,
  is_deleted        boolean       not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now(),
  constraint usage_logs_dosage_positive check (dosage_amount > 0),
  constraint usage_logs_deducted_non_negative check (quantity_deducted >= 0)
);

-- 药品详情的「最近服药历史」
create index if not exists idx_usage_logs_medicine_taken
  on public.medicine_usage_logs (medicine_id, taken_at desc)
  where is_deleted = false;

-- 药箱维度的历史 / 统计（P2）
create index if not exists idx_usage_logs_box_taken
  on public.medicine_usage_logs (box_id, taken_at desc)
  where is_deleted = false;

create index if not exists idx_usage_logs_user_taken
  on public.medicine_usage_logs (user_id, taken_at desc)
  where is_deleted = false;

drop trigger if exists trg_usage_logs_updated_at on public.medicine_usage_logs;
create trigger trg_usage_logs_updated_at
  before update on public.medicine_usage_logs
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. RLS：只给 SELECT 策略
--    写入全部走 RPC（记账 + 扣库存必须原子，不能让前端分两步做）
-- ------------------------------------------------------------
alter table public.medicine_usage_logs enable row level security;

drop policy if exists usage_logs_select_member on public.medicine_usage_logs;
create policy usage_logs_select_member
  on public.medicine_usage_logs for select to authenticated
  using (public.is_box_member(box_id));

-- ------------------------------------------------------------
-- 3. RPC：记录本次服药（同一事务内扣库存 + 写日志 + 更新最近服药时间）
--    规则：
--    - 库存扣到 0 为止，绝不为负
--    - 库存已是 0 时，仍然写日志（quantity_deducted = 0）
--    - last_taken_at 只增不减，保证列表排序稳定
-- ------------------------------------------------------------
create or replace function public.record_medicine_usage(
  p_medicine_id uuid,
  p_dosage numeric default 1,
  p_note text default null,
  p_taken_at timestamptz default null
)
returns table (log_id uuid, taken_at timestamptz, quantity_deducted numeric, quantity_left numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_med public.medicines;
  v_taken_at timestamptz := coalesce(p_taken_at, now());
  v_dose numeric := coalesce(p_dosage, 1);
  v_deduct numeric;
  v_log_id uuid;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if v_dose <= 0 then
    raise exception 'DOSAGE_INVALID' using errcode = '22023';
  end if;
  if v_taken_at > now() + interval '5 minutes' then
    raise exception 'TAKEN_AT_FUTURE' using errcode = '22023';
  end if;

  select * into v_med
  from public.medicines m
  where m.id = p_medicine_id and m.is_deleted = false
  for update;

  if v_med.id is null then
    raise exception 'MEDICINE_NOT_FOUND' using errcode = '22023';
  end if;
  if not public.is_box_member(v_med.box_id) then
    raise exception 'NOT_BOX_MEMBER' using errcode = '42501';
  end if;

  -- 扣减量 = min(本次剂量, 当前库存)，所以永远不会扣成负数
  v_deduct := least(v_dose, v_med.quantity);

  update public.medicines m
     set quantity = m.quantity - v_deduct,
         last_taken_at = greatest(coalesce(m.last_taken_at, v_taken_at), v_taken_at)
   where m.id = v_med.id;

  insert into public.medicine_usage_logs (
    box_id, medicine_id, user_id, taken_at, dosage_amount, quantity_deducted, note
  )
  values (
    v_med.box_id, v_med.id, v_uid, v_taken_at, v_dose, v_deduct, nullif(btrim(p_note), '')
  )
  returning id into v_log_id;

  return query
  select v_log_id, v_taken_at, v_deduct, (v_med.quantity - v_deduct);
end;
$$;

-- ------------------------------------------------------------
-- 4. RPC：撤销一条服药记录（回补库存 + 重算最近服药时间）
--    权限：本人，或该药箱的创建者
-- ------------------------------------------------------------
create or replace function public.undo_usage_log(p_log_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_log public.medicine_usage_logs;
  v_last timestamptz;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  select * into v_log
  from public.medicine_usage_logs l
  where l.id = p_log_id and l.is_deleted = false
  for update;

  if v_log.id is null then
    raise exception 'LOG_NOT_FOUND' using errcode = '22023';
  end if;
  if v_log.user_id <> v_uid and not public.is_box_creator(v_log.box_id) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;

  update public.medicine_usage_logs
     set is_deleted = true, deleted_at = now()
   where id = v_log.id;

  update public.medicines m
     set quantity = m.quantity + v_log.quantity_deducted
   where m.id = v_log.medicine_id;

  select max(l.taken_at) into v_last
  from public.medicine_usage_logs l
  where l.medicine_id = v_log.medicine_id and l.is_deleted = false;

  update public.medicines m
     set last_taken_at = v_last
   where m.id = v_log.medicine_id;
end;
$$;

-- ------------------------------------------------------------
-- 5. 授权：只给登录用户
-- ------------------------------------------------------------
revoke all on function public.record_medicine_usage(uuid, numeric, text, timestamptz) from public;
revoke all on function public.record_medicine_usage(uuid, numeric, text, timestamptz) from anon;
grant execute on function public.record_medicine_usage(uuid, numeric, text, timestamptz) to authenticated;

revoke all on function public.undo_usage_log(uuid) from public;
revoke all on function public.undo_usage_log(uuid) from anon;
grant execute on function public.undo_usage_log(uuid) to authenticated;

-- ------------------------------------------------------------
-- 6. 自检
-- ------------------------------------------------------------
select
  (select count(*) from pg_tables where schemaname = 'public' and tablename = 'medicine_usage_logs') = 1
  and (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname in ('record_medicine_usage', 'undo_usage_log')) = 2
  as t5_ok;
