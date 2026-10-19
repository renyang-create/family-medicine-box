-- ============================================================
-- 家庭药箱 · T4：medicines 表 + RLS + 过期状态刷新函数
-- 执行：Supabase Dashboard → SQL Editor → 粘贴整段 → Run
-- 幂等：可重复执行
-- ============================================================

-- ------------------------------------------------------------
-- 1. 药品表
--    排序核心字段 last_taken_at：只由「记录服药」RPC 维护（T5）
--    expire_date 是日历日期（date），不做时区换算
--    expiry_status 由 pg_cron 每日用 UTC 刷新，仅作服务端辅助；
--    UI 永远按设备本地时区实时判定（见 src/shared/domain/expiry.ts）
-- ------------------------------------------------------------
create table if not exists public.medicines (
  id               uuid primary key default gen_random_uuid(),
  box_id           uuid          not null references public.medicine_boxes (id),
  name             text          not null,
  spec             text,
  quantity         numeric(10,2) not null default 0,
  unit             text          default '片',
  dosage           text,
  storage_location text,
  batch_no         text,
  produced_on      date,
  expire_date      date,
  expiry_status    text          not null default 'normal',
  notes            text,
  last_taken_at    timestamptz,
  created_by       uuid          not null default auth.uid() references public.profiles (id),
  is_deleted       boolean       not null default false,
  deleted_at       timestamptz,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now(),
  constraint medicines_name_len check (char_length(btrim(name)) between 1 and 40),
  constraint medicines_quantity_non_negative check (quantity >= 0),
  constraint medicines_expiry_status_check check (expiry_status in ('normal', 'near_expiry', 'expired'))
);

-- 列表排序：先按药箱，再按最近服药时间倒序（NULL 排最后）
create index if not exists idx_medicines_box_sort
  on public.medicines (box_id, last_taken_at desc nulls last)
  where is_deleted = false;

-- 过期置顶：按有效期升序（越早过期越靠前）
create index if not exists idx_medicines_box_expire
  on public.medicines (box_id, expire_date)
  where is_deleted = false and expire_date is not null;

create index if not exists idx_medicines_name_trgm
  on public.medicines (lower(name))
  where is_deleted = false;

drop trigger if exists trg_medicines_updated_at on public.medicines;
create trigger trg_medicines_updated_at
  before update on public.medicines
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. RLS
--    读：药箱成员；写：药箱成员（不跨箱）
--    不给 DELETE 策略：删除只做软删（is_deleted = true）
-- ------------------------------------------------------------
alter table public.medicines enable row level security;

drop policy if exists medicines_select_member on public.medicines;
create policy medicines_select_member
  on public.medicines for select to authenticated
  using (public.is_box_member(box_id));

drop policy if exists medicines_insert_member on public.medicines;
create policy medicines_insert_member
  on public.medicines for insert to authenticated
  with check (public.is_box_member(box_id) and created_by = auth.uid());

drop policy if exists medicines_update_member on public.medicines;
create policy medicines_update_member
  on public.medicines for update to authenticated
  using (public.is_box_member(box_id))
  with check (public.is_box_member(box_id));

-- ------------------------------------------------------------
-- 3. 过期状态批量刷新（给 pg_cron 每日调用；T6 里接定时任务）
--    注意：这里用 UTC 的 current_date，与设备本地时区可能差 1 天，
--    所以只用于服务端筛选，UI 显示一律用本地时区实时计算。
-- ------------------------------------------------------------
create or replace function public.refresh_expiry_status()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  with calc as (
    select
      m.id,
      case
        when m.expire_date is null then 'normal'
        when m.expire_date < current_date then 'expired'
        when m.expire_date <= current_date + 30 then 'near_expiry'
        else 'normal'
      end as next_status
    from public.medicines m
    where m.is_deleted = false
  )
  update public.medicines m
     set expiry_status = calc.next_status
    from calc
   where m.id = calc.id
     and m.expiry_status <> calc.next_status;
$$;

revoke all on function public.refresh_expiry_status() from public;
revoke all on function public.refresh_expiry_status() from anon;
grant execute on function public.refresh_expiry_status() to authenticated;

-- ------------------------------------------------------------
-- 4. 加固：把所有 public 函数的 EXECUTE 从 anon 上摘掉
--    （之前实测 anon 仍能「调用」函数，只是被内部 auth.uid() 拦住；
--      这里把外门也锁上，属于纵深防御）
-- ------------------------------------------------------------
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('revoke all on function %s from anon', f.sig);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 5. 自检
-- ------------------------------------------------------------
select
  (select count(*) from pg_tables where schemaname = 'public' and tablename = 'medicines') = 1
  and (select count(*) from pg_policies where schemaname = 'public' and tablename = 'medicines') = 3
  and (select count(*) from pg_indexes where schemaname = 'public' and indexname in ('idx_medicines_box_sort', 'idx_medicines_box_expire')) = 2
  as t4_ok;
