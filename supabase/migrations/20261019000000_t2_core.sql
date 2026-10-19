-- ============================================================
-- 家庭药箱 · T2：核心表 / RLS / RPC
-- 适用：Supabase Postgres（托管）
-- 执行：Supabase Dashboard → SQL Editor → 粘贴整段 → Run
-- 幂等：表用 if not exists，函数用 create or replace，策略先 drop
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 0. 公共工具
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 邀请码：6 位大写，去掉容易混淆的 0 / O / 1 / I / L
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_result text := '';
  i integer;
begin
  for i in 1..6 loop
    v_result := v_result || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
  end loop;
  return v_result;
end;
$$;

-- 邀请码归一化：去掉所有空白 + 转大写（与客户端 normalizeInviteCode 规则一致）
create or replace function public.normalize_invite_code(p_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
$$;

-- ------------------------------------------------------------
-- 1. profiles（用户）
--    主键直接用 auth.users.id，天然 1:1
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text        not null,
  is_deleted   boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint profiles_display_name_len check (char_length(btrim(display_name)) between 1 and 20)
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 注册后自动建 profile（昵称优先取 metadata，其次邮箱前缀，最后「家人」）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        '家人'
      ),
      20
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 2. medicine_boxes（药箱）
--    invite_code：6 位大写 + 全局唯一；重置即覆盖，旧码立刻失效
--    creator_transferred_at：转让审计（谁在什么时候接手的）
-- ------------------------------------------------------------
create table if not exists public.medicine_boxes (
  id                       uuid primary key default gen_random_uuid(),
  name                     text        not null,
  description              text,
  invite_code              text        not null,
  invite_code_updated_at   timestamptz not null default now(),
  member_count             integer     not null default 1,
  created_by               uuid        not null references public.profiles (id),
  creator_transferred_at   timestamptz,
  is_deleted               boolean     not null default false,
  deleted_at               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint medicine_boxes_name_len check (char_length(btrim(name)) between 1 and 30),
  constraint medicine_boxes_member_count_range check (member_count between 0 and 5),
  constraint medicine_boxes_invite_code_key unique (invite_code),
  constraint medicine_boxes_invite_code_format check (
    invite_code = upper(invite_code) and invite_code ~ '^[A-Z0-9]{6}$'
  )
);

create index if not exists idx_medicine_boxes_creator
  on public.medicine_boxes (created_by) where is_deleted = false;

drop trigger if exists trg_medicine_boxes_updated_at on public.medicine_boxes;
create trigger trg_medicine_boxes_updated_at
  before update on public.medicine_boxes
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 3. box_members（用户 ↔ 药箱 多对多，最多 5 人，每箱只有一个 creator）
-- ------------------------------------------------------------
create table if not exists public.box_members (
  id         uuid primary key default gen_random_uuid(),
  box_id     uuid        not null references public.medicine_boxes (id),
  user_id    uuid        not null references public.profiles (id),
  role       text        not null default 'member',
  joined_at  timestamptz not null default now(),
  is_deleted boolean     not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint box_members_role_check check (role in ('creator', 'member'))
);

-- 同一用户不可重复加入同一药箱（退出后重新加入允许，所以是部分唯一索引）
create unique index if not exists un_box_members_active
  on public.box_members (box_id, user_id) where is_deleted = false;

-- 关键约束：每个药箱最多一个 creator —— 配合 RPC 保证「不会出现两个创建者 / 不能无主」
create unique index if not exists un_box_single_creator
  on public.box_members (box_id) where role = 'creator' and is_deleted = false;

create index if not exists idx_box_members_user_active
  on public.box_members (user_id) where is_deleted = false;
create index if not exists idx_box_members_box_active
  on public.box_members (box_id) where is_deleted = false;

drop trigger if exists trg_box_members_updated_at on public.box_members;
create trigger trg_box_members_updated_at
  before update on public.box_members
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4. 权限辅助函数（SECURITY DEFINER：绕过 RLS，避免策略自我递归）
--    一律以 auth.uid() 判断身份，绝不接受前端传入的「我是谁」
-- ------------------------------------------------------------

create or replace function public.is_box_member(p_box_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.box_members bm
    join public.medicine_boxes mb on mb.id = bm.box_id
    where bm.box_id = p_box_id
      and bm.user_id = auth.uid()
      and bm.is_deleted = false
      and mb.is_deleted = false
  );
$$;

create or replace function public.is_box_creator(p_box_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.box_members bm
    join public.medicine_boxes mb on mb.id = bm.box_id
    where bm.box_id = p_box_id
      and bm.user_id = auth.uid()
      and bm.role = 'creator'
      and bm.is_deleted = false
      and mb.is_deleted = false
  );
$$;

-- 我是否与某个用户共处过至少一个药箱（用于展示成员昵称）
create or replace function public.shares_box(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.box_members me
    join public.box_members other on other.box_id = me.box_id
    where me.user_id = auth.uid()
      and me.is_deleted = false
      and other.user_id = p_other_user_id
      and other.is_deleted = false
  );
$$;

revoke all on function public.is_box_member(uuid) from public;
revoke all on function public.is_box_creator(uuid) from public;
revoke all on function public.shares_box(uuid) from public;
grant execute on function public.is_box_member(uuid) to authenticated;
grant execute on function public.is_box_creator(uuid) to authenticated;
grant execute on function public.shares_box(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5. RLS
--    原则：读用 is_box_member / is_box_creator；写全部走 RPC（不给 UPDATE 策略）
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.medicine_boxes enable row level security;
alter table public.box_members enable row level security;

-- profiles：只能看自己 + 与自己同箱的人；只能改自己
drop policy if exists profiles_select_self_or_shared on public.profiles;
create policy profiles_select_self_or_shared
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_box(id));

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- medicine_boxes：只有成员能看；建箱/改名/重置/删除全部走 RPC
drop policy if exists boxes_select_member on public.medicine_boxes;
create policy boxes_select_member
  on public.medicine_boxes for select to authenticated
  using (public.is_box_member(id));

-- box_members：只能看自己所在药箱的成员；加入/退出/移除/转让全部走 RPC
drop policy if exists members_select_in_box on public.box_members;
create policy members_select_in_box
  on public.box_members for select to authenticated
  using (public.is_box_member(box_id));

-- ------------------------------------------------------------
-- 6. 内部工具
-- ------------------------------------------------------------

-- 重算成员数（每次成员变动后调用，避免手写加减出错）
create or replace function public.refresh_member_count(p_box_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.medicine_boxes mb
     set member_count = (
       select count(*) from public.box_members bm
       where bm.box_id = p_box_id and bm.is_deleted = false
     )
   where mb.id = p_box_id;
$$;

-- 确保调用者在 profiles 里有行（触发器的兜底，防止历史用户缺行）
create or replace function public.ensure_profile(p_uid uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.profiles (id, display_name)
  select
    p_uid,
    left(
      coalesce(
        nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
        nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
        '家人'
      ),
      20
    )
  from auth.users u
  where u.id = p_uid
  on conflict (id) do nothing;
$$;

-- 新码生成（冲突重试）
create or replace function public.allocate_invite_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_try integer := 0;
begin
  loop
    v_try := v_try + 1;
    v_code := public.generate_invite_code();
    exit when not exists (select 1 from public.medicine_boxes mb where mb.invite_code = v_code);
    if v_try >= 50 then
      raise exception 'INVITE_CODE_EXHAUSTED' using errcode = '23505';
    end if;
  end loop;
  return v_code;
end;
$$;

-- ------------------------------------------------------------
-- 7. RPC：药箱生命周期
-- ------------------------------------------------------------

-- 7.1 创建药箱：建箱 + 自动成为 creator（同一事务）
create or replace function public.create_box(p_name text)
returns public.medicine_boxes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_box public.medicine_boxes;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'BOX_NAME_REQUIRED' using errcode = '22023';
  end if;

  perform public.ensure_profile(v_uid);

  insert into public.medicine_boxes (name, invite_code, created_by)
  values (btrim(p_name), public.allocate_invite_code(), v_uid)
  returning * into v_box;

  insert into public.box_members (box_id, user_id, role)
  values (v_box.id, v_uid, 'creator');

  perform public.refresh_member_count(v_box.id);

  select * into v_box from public.medicine_boxes where id = v_box.id;
  return v_box;
end;
$$;

-- 7.2 用邀请码加入（忽略大小写与空格；最多 5 人；不可重复加入）
create or replace function public.join_box_by_invite_code(p_code text)
returns table (box_id uuid, box_name text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := public.normalize_invite_code(p_code);
  v_box public.medicine_boxes;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if length(v_code) <> 6 then
    raise exception 'INVITE_CODE_INVALID' using errcode = '22023';
  end if;

  perform public.ensure_profile(v_uid);

  -- 行锁：并发加入时串行化，防止同时进门变成 6 人
  select * into v_box
  from public.medicine_boxes mb
  where mb.invite_code = v_code and mb.is_deleted = false
  for update;

  if v_box.id is null then
    raise exception 'INVITE_CODE_INVALID' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.box_members bm
    where bm.box_id = v_box.id and bm.user_id = v_uid and bm.is_deleted = false
  ) then
    raise exception 'ALREADY_MEMBER' using errcode = '23505';
  end if;

  select count(*) into v_count
  from public.box_members bm
  where bm.box_id = v_box.id and bm.is_deleted = false;

  if v_count >= 5 then
    raise exception 'BOX_MEMBER_LIMIT' using errcode = '23514';
  end if;

  insert into public.box_members (box_id, user_id, role)
  values (v_box.id, v_uid, 'member');

  perform public.refresh_member_count(v_box.id);

  return query select v_box.id, v_box.name;
end;
$$;

-- 7.3 重置邀请码（仅 creator；旧码立刻失效）
create or replace function public.reset_invite_code(p_box_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if not public.is_box_creator(p_box_id) then
    raise exception 'NOT_BOX_CREATOR' using errcode = '42501';
  end if;

  v_code := public.allocate_invite_code();

  update public.medicine_boxes
     set invite_code = v_code,
         invite_code_updated_at = now()
   where id = p_box_id and is_deleted = false;

  return v_code;
end;
$$;

-- 7.4 转让创建者（药箱不能无主：退出前必须先转让）
create or replace function public.transfer_box_creator(p_box_id uuid, p_to_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if not public.is_box_creator(p_box_id) then
    raise exception 'NOT_BOX_CREATOR' using errcode = '42501';
  end if;
  if p_to_user_id = v_uid then
    raise exception 'CANNOT_TRANSFER_TO_SELF' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.box_members bm
    where bm.box_id = p_box_id and bm.user_id = p_to_user_id and bm.is_deleted = false
  ) then
    raise exception 'TARGET_NOT_MEMBER' using errcode = '22023';
  end if;

  -- 顺序很重要：先降级旧 creator，再升级新 creator（部分唯一索引逐语句校验）
  update public.box_members
     set role = 'member'
   where box_id = p_box_id and user_id = v_uid and role = 'creator' and is_deleted = false;

  update public.box_members
     set role = 'creator'
   where box_id = p_box_id and user_id = p_to_user_id and is_deleted = false;

  update public.medicine_boxes
     set created_by = p_to_user_id,
         creator_transferred_at = now()
   where id = p_box_id;
end;
$$;

-- 7.5 主动退出（creator 必须先转让；仅剩一人时用 dissolve_box 解散）
create or replace function public.leave_box(p_box_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  select bm.role into v_role
  from public.box_members bm
  where bm.box_id = p_box_id and bm.user_id = v_uid and bm.is_deleted = false;

  if v_role is null then
    raise exception 'NOT_BOX_MEMBER' using errcode = '42501';
  end if;
  if v_role = 'creator' then
    raise exception 'CREATOR_MUST_TRANSFER' using errcode = '42501';
  end if;

  update public.box_members
     set is_deleted = true, deleted_at = now()
   where box_id = p_box_id and user_id = v_uid and is_deleted = false;

  perform public.refresh_member_count(p_box_id);
end;
$$;

-- 7.6 移除成员（仅 creator；不能移除自己）
create or replace function public.remove_box_member(p_box_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if not public.is_box_creator(p_box_id) then
    raise exception 'NOT_BOX_CREATOR' using errcode = '42501';
  end if;
  if p_user_id = v_uid then
    raise exception 'CANNOT_REMOVE_SELF' using errcode = '22023';
  end if;

  select bm.role into v_role
  from public.box_members bm
  where bm.box_id = p_box_id and bm.user_id = p_user_id and bm.is_deleted = false;

  if v_role is null then
    raise exception 'TARGET_NOT_MEMBER' using errcode = '22023';
  end if;

  update public.box_members
     set is_deleted = true, deleted_at = now()
   where box_id = p_box_id and user_id = p_user_id and is_deleted = false;

  perform public.refresh_member_count(p_box_id);
end;
$$;

-- 7.7 解散药箱（仅 creator；用于「只剩我一个人」的场景）
--     全部软删除，不物理删除任何行；T3 起会在这里级联软删药品/记录/计划/提醒
create or replace function public.dissolve_box(p_box_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if not public.is_box_creator(p_box_id) then
    raise exception 'NOT_BOX_CREATOR' using errcode = '42501';
  end if;

  update public.box_members
     set is_deleted = true, deleted_at = now()
   where box_id = p_box_id and is_deleted = false;

  update public.medicine_boxes
     set is_deleted = true,
         deleted_at = now(),
         member_count = 0
   where id = p_box_id and is_deleted = false;
end;
$$;

-- ------------------------------------------------------------
-- 8. 函数授权：只给登录用户，匿名角色一律不给
-- ------------------------------------------------------------
do $$
declare
  v_sig text;
begin
  foreach v_sig in array array[
    'public.create_box(text)',
    'public.join_box_by_invite_code(text)',
    'public.reset_invite_code(uuid)',
    'public.transfer_box_creator(uuid, uuid)',
    'public.leave_box(uuid)',
    'public.remove_box_member(uuid, uuid)',
    'public.dissolve_box(uuid)',
    'public.refresh_member_count(uuid)',
    'public.ensure_profile(uuid)',
    'public.allocate_invite_code()',
    'public.generate_invite_code()',
    'public.normalize_invite_code(text)'
  ]
  loop
    execute format('revoke all on function %s from public', v_sig);
    execute format('grant execute on function %s to authenticated', v_sig);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 9. 自检（跑完会返回一行 ok=true）
-- ------------------------------------------------------------
select
  (select count(*) from pg_tables where schemaname = 'public' and tablename in ('profiles', 'medicine_boxes', 'box_members')) = 3
  and (select count(*) from pg_policies where schemaname = 'public' and tablename in ('profiles', 'medicine_boxes', 'box_members')) >= 5
  and (select count(*) from pg_indexes where schemaname = 'public' and indexname in ('un_box_members_active', 'un_box_single_creator')) = 2
  as t2_ok;
