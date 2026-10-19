-- ============================================================
-- 家庭药箱 · T8：吃药计划（模板）+ 提醒实例
-- 执行：Supabase Dashboard → SQL Editor → 粘贴整段 → Run
--
-- 边界（很重要）：
--   - medication_plans = 用户配置的模板（每天几点吃）
--   - reminders = 由模板展开的提醒实例，notification_id 对应
--     expo-notifications 的本地通知，由客户端消费
--   - pg_cron 不生成、不推送吃药提醒（它只刷新有效期状态）
--   - 吃药计划仅创建者可见（个人隐私），不共享给同箱成员
-- ============================================================

-- ------------------------------------------------------------
-- 1. 吃药计划（模板）
-- ------------------------------------------------------------
create table if not exists public.medication_plans (
  id            uuid primary key default gen_random_uuid(),
  box_id        uuid          not null references public.medicine_boxes (id),
  medicine_id   uuid          not null references public.medicines (id),
  created_by    uuid          not null default auth.uid() references public.profiles (id),
  dosage_amount numeric(10,2) not null default 1,
  times_of_day  text[]        not null default array['08:00'],
  is_active     boolean       not null default true,
  is_deleted    boolean       not null default false,
  deleted_at    timestamptz,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now(),
  constraint plans_dosage_positive check (dosage_amount > 0)
);

create index if not exists idx_plans_owner_medicine
  on public.medication_plans (created_by, medicine_id)
  where is_deleted = false and is_active = true;

drop trigger if exists trg_plans_updated_at on public.medication_plans;
create trigger trg_plans_updated_at
  before update on public.medication_plans
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. 提醒实例（每条对应一个「每天几点」的本地通知）
-- ------------------------------------------------------------
create table if not exists public.reminders (
  id              uuid primary key default gen_random_uuid(),
  box_id          uuid        not null references public.medicine_boxes (id),
  plan_id         uuid        not null references public.medication_plans (id),
  medicine_id     uuid        not null references public.medicines (id),
  user_id         uuid        not null default auth.uid() references public.profiles (id),
  time_label      text        not null,
  scheduled_at    timestamptz,
  status          text        not null default 'pending',
  notification_id text,
  is_deleted      boolean     not null default false,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint reminders_time_format check (time_label ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint reminders_status_check check (status in ('pending', 'cancelled', 'taken', 'skipped'))
);

-- 同一计划同一时刻只能有一条有效提醒（重新保存时先软删旧的）
create unique index if not exists un_reminders_plan_time
  on public.reminders (plan_id, time_label) where is_deleted = false;

create index if not exists idx_reminders_user_pending
  on public.reminders (user_id, scheduled_at)
  where is_deleted = false and status = 'pending';

drop trigger if exists trg_reminders_updated_at on public.reminders;
create trigger trg_reminders_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 3. RLS
--    计划：仅创建者可见可改（同箱成员看不到你的用药计划）
--    提醒：仅本人可见可改
-- ------------------------------------------------------------
alter table public.medication_plans enable row level security;

drop policy if exists plans_select_owner on public.medication_plans;
create policy plans_select_owner
  on public.medication_plans for select to authenticated
  using (created_by = auth.uid());

drop policy if exists plans_insert_owner on public.medication_plans;
create policy plans_insert_owner
  on public.medication_plans for insert to authenticated
  with check (created_by = auth.uid() and public.is_box_member(box_id));

drop policy if exists plans_update_owner on public.medication_plans;
create policy plans_update_owner
  on public.medication_plans for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

alter table public.reminders enable row level security;

drop policy if exists reminders_select_owner on public.reminders;
create policy reminders_select_owner
  on public.reminders for select to authenticated
  using (user_id = auth.uid());

drop policy if exists reminders_insert_owner on public.reminders;
create policy reminders_insert_owner
  on public.reminders for insert to authenticated
  with check (user_id = auth.uid() and public.is_box_member(box_id));

drop policy if exists reminders_update_owner on public.reminders;
create policy reminders_update_owner
  on public.reminders for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 4. 自检
-- ------------------------------------------------------------
select
  (select count(*) from pg_tables
    where schemaname = 'public' and tablename in ('medication_plans', 'reminders')) = 2
  and (select count(*) from pg_policies
    where schemaname = 'public' and tablename in ('medication_plans', 'reminders')) >= 6
  as t8_ok;
