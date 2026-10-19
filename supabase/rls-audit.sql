-- ============================================================
-- RLS 体检（只读，不改数据）
--
-- 用法：Supabase Dashboard → SQL Editor → 粘贴其中一段 → Run
-- 三段分开跑，不要一次全选（Dashboard 只显示最后一段的结果）。
--
-- 背景：anon key 会随 APK 公开，前端传的 user_id 不作数，
--      所以数据库里的 RLS 是唯一的权限边界。
-- ============================================================


-- ------------------------------------------------------------
-- 1. 总览：每张表开没开 RLS、有几条策略、覆盖哪些操作
--    期望：所有表「结论」列都是 ok
-- ------------------------------------------------------------
select
  c.relname                                                  as "表名",
  case when c.relrowsecurity then 'ON' else 'OFF' end         as "RLS",
  coalesce(p.policy_count, 0)                                 as "策略数",
  coalesce(p.cmds, '-')                                       as "覆盖操作",
  coalesce(p.weak, 0)                                         as "可疑策略",
  case
    when not c.relrowsecurity                        then '严重：未开 RLS（anon key 可直读）'
    when coalesce(p.policy_count, 0) = 0             then '无用：开了 RLS 却无策略（除 service_role 外全被拒）'
    when coalesce(p.weak, 0) > 0                     then '待查：存在 using(true) 或对 anon 开放'
    else 'ok'
  end                                                         as "结论"
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join (
  select
    tablename,
    count(*)                                              as policy_count,
    string_agg(distinct cmd, '/' order by cmd)             as cmds,
    count(*) filter (
      where qual = 'true'
         or with_check = 'true'
         or 'anon' = any (roles)
    )                                                      as weak
  from pg_policies
  where schemaname = 'public'
  group by tablename
) p on p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind = 'r'
order by
  case
    when not c.relrowsecurity            then 0
    when coalesce(p.policy_count, 0) = 0 then 1
    when coalesce(p.weak, 0) > 0         then 2
    else 3
  end,
  c.relname;


-- ------------------------------------------------------------
-- 2. 逐条策略：确认每条都真的绑了 auth.uid()
--    看 qual / with_check 两列里有没有 auth.uid()；
--    如果某条是 true，就等于「谁都能读写」。
-- ------------------------------------------------------------
select
  tablename  as "表",
  policyname as "策略名",
  cmd        as "操作",
  roles      as "角色",
  qual       as "USING 条件",
  with_check as "WITH CHECK 条件"
from pg_policies
where schemaname = 'public'
order by tablename, policyname;


-- ------------------------------------------------------------
-- 3. 函数层：这两个函数必须只给 authenticated，
--    否则任何人都能自己给自己发额度。
-- ------------------------------------------------------------
select
  p.proname                                             as "函数",
  pg_get_userbyid(p.proowner)                           as "owner",
  coalesce(array_to_string(p.proacl, ' | '), '(默认)')   as "权限"
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'consume_ai_quota',
    'ai_quota_status',
    'refund_ai_quota'
  )
order by p.proname;
