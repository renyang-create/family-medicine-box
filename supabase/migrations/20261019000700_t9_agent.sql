-- ============================================================
-- 家庭药箱 · T9：任阳问答（会话 / 消息 / 每日额度）
-- 执行：Supabase Dashboard → SQL Editor → 粘贴整段 → Run
--
-- 安全与边界：
--   - AI 会话是「个人私有」，不共享给药箱成员
--   - 额度用「服务端原子自增」，前端无法绕过；日期按 UTC 计
--   - 免责声明是前端静态文案，不存在数据库里，也不由模型生成
-- ============================================================

-- ------------------------------------------------------------
-- 1. 会话
-- ------------------------------------------------------------
create table if not exists public.ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid() references public.profiles (id),
  title      text,
  model      text,
  is_deleted boolean     not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_conversations_user
  on public.ai_conversations (user_id, updated_at desc)
  where is_deleted = false;

drop trigger if exists trg_ai_conversations_updated_at on public.ai_conversations;
create trigger trg_ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. 消息
-- ------------------------------------------------------------
create table if not exists public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.ai_conversations (id),
  user_id         uuid        not null default auth.uid() references public.profiles (id),
  role            text        not null,
  content         text        not null,
  model           text,
  is_deleted      boolean     not null default false,
  created_at      timestamptz not null default now(),
  constraint ai_messages_role_check check (role in ('user', 'assistant')),
  constraint ai_messages_content_len check (char_length(content) between 1 and 4000)
);

create index if not exists idx_ai_messages_conversation
  on public.ai_messages (conversation_id, created_at)
  where is_deleted = false;

-- ------------------------------------------------------------
-- 3. 每日额度（UTC 日；每人每天一行）
-- ------------------------------------------------------------
create table if not exists public.ai_daily_quota (
  user_id    uuid        not null references public.profiles (id),
  quota_date date        not null,
  used_count integer     not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, quota_date),
  constraint ai_daily_quota_non_negative check (used_count >= 0)
);

-- ------------------------------------------------------------
-- 4. RLS
--    会话/消息：仅本人；额度：只读自己的，写入只能走函数
-- ------------------------------------------------------------
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_daily_quota enable row level security;

-- 注意：不给 DELETE 策略（全项目统一：删除只做软删）
drop policy if exists ai_conversations_select_owner on public.ai_conversations;
create policy ai_conversations_select_owner
  on public.ai_conversations for select to authenticated
  using (user_id = auth.uid());

drop policy if exists ai_conversations_insert_owner on public.ai_conversations;
create policy ai_conversations_insert_owner
  on public.ai_conversations for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists ai_conversations_update_owner on public.ai_conversations;
create policy ai_conversations_update_owner
  on public.ai_conversations for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists ai_messages_select_owner on public.ai_messages;
create policy ai_messages_select_owner
  on public.ai_messages for select to authenticated
  using (user_id = auth.uid());

drop policy if exists ai_messages_insert_owner on public.ai_messages;
create policy ai_messages_insert_owner
  on public.ai_messages for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists ai_messages_update_owner on public.ai_messages;
create policy ai_messages_update_owner
  on public.ai_messages for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists ai_quota_select_owner on public.ai_daily_quota;
create policy ai_quota_select_owner
  on public.ai_daily_quota for select to authenticated
  using (user_id = auth.uid());

-- ------------------------------------------------------------
-- 5. 额度函数（原子扣减 / 查询）
-- ------------------------------------------------------------
create or replace function public.consume_ai_quota(p_limit integer default 20)
returns table (allowed boolean, used integer, remaining integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_date date := (now() at time zone 'UTC')::date;
  v_used integer;
  v_limit integer := coalesce(nullif(p_limit, 0), 20);
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  insert into public.ai_daily_quota (user_id, quota_date, used_count)
  values (v_uid, v_date, 1)
  on conflict (user_id, quota_date) do update
     set used_count = public.ai_daily_quota.used_count + 1,
         updated_at = now()
   where public.ai_daily_quota.used_count < v_limit
  returning used_count into v_used;

  if v_used is null then
    select q.used_count into v_used
    from public.ai_daily_quota q
    where q.user_id = v_uid and q.quota_date = v_date;

    return query select false, coalesce(v_used, v_limit), 0;
  end if;

  return query select true, v_used, greatest(v_limit - v_used, 0);
end;
$$;

create or replace function public.ai_quota_status(p_limit integer default 20)
returns table (used integer, remaining integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_date date := (now() at time zone 'UTC')::date;
  v_used integer;
  v_limit integer := coalesce(nullif(p_limit, 0), 20);
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  select q.used_count into v_used
  from public.ai_daily_quota q
  where q.user_id = v_uid and q.quota_date = v_date;

  return query select coalesce(v_used, 0), greatest(v_limit - coalesce(v_used, 0), 0);
end;
$$;

-- 上游失败时退回一次额度（避免「调用失败也扣次数」）
create or replace function public.refund_ai_quota()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_date date := (now() at time zone 'UTC')::date;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  update public.ai_daily_quota q
     set used_count = greatest(q.used_count - 1, 0),
         updated_at = now()
   where q.user_id = v_uid and q.quota_date = v_date;
end;
$$;

revoke all on function public.refund_ai_quota() from public;
revoke all on function public.refund_ai_quota() from anon;
grant execute on function public.refund_ai_quota() to authenticated;

revoke all on function public.consume_ai_quota(integer) from public;
revoke all on function public.consume_ai_quota(integer) from anon;
grant execute on function public.consume_ai_quota(integer) to authenticated;

revoke all on function public.ai_quota_status(integer) from public;
revoke all on function public.ai_quota_status(integer) from anon;
grant execute on function public.ai_quota_status(integer) to authenticated;

-- ------------------------------------------------------------
-- 6. 自检
-- ------------------------------------------------------------
select
  (select count(*) from pg_tables
    where schemaname = 'public'
      and tablename in ('ai_conversations', 'ai_messages', 'ai_daily_quota')) = 3
  and (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in ('consume_ai_quota', 'ai_quota_status')) = 2
  as t9_ok;
