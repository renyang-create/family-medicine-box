-- ============================================================
-- 家庭药箱 · T7：解散药箱时级联软删（成员管理收尾）
-- 执行：Supabase Dashboard → SQL Editor → 粘贴整段 → Run
--
-- 说明：
--   - 成员相关的 RPC（转让 / 移除 / 退出 / 重置邀请码）在 T2 已经建好，
--     这次只把 dissolve_box 补成「级联软删」，避免删箱后留下孤儿数据。
--   - 全部是软删除（is_deleted = true），不物理删任何行。
-- ============================================================

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

  -- 1. 服药记录
  update public.medicine_usage_logs
     set is_deleted = true, deleted_at = now()
   where box_id = p_box_id and is_deleted = false;

  -- 2. 药品
  update public.medicines
     set is_deleted = true, deleted_at = now()
   where box_id = p_box_id and is_deleted = false;

  -- 3. 成员
  update public.box_members
     set is_deleted = true, deleted_at = now()
   where box_id = p_box_id and is_deleted = false;

  -- 4. 药箱本身
  update public.medicine_boxes
     set is_deleted = true,
         deleted_at = now(),
         member_count = 0
   where id = p_box_id and is_deleted = false;
end;
$$;

revoke all on function public.dissolve_box(uuid) from public;
revoke all on function public.dissolve_box(uuid) from anon;
grant execute on function public.dissolve_box(uuid) to authenticated;

-- 自检
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'dissolve_box') = 1 as t7_ok;
