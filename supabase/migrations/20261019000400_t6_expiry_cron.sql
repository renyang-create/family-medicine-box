-- ============================================================
-- 家庭药箱 · T6：每日刷新药品临期/过期状态（pg_cron）
--
-- 前置：在 Supabase 后台开启 pg_cron 扩展
--   Dashboard → Database → Extensions → 搜索 pg_cron → 打开
--
-- 说明（边界很重要）：
--   - 这个定时任务只做「批量计算 expiry_status」，
--     **不负责吃药提醒，也不发任何推送**。
--   - UI 显示仍然按设备本地时区实时判定，不依赖这个字段。
-- ============================================================

-- 1. 确保扩展可用（若上一步没开，这里可能会报权限错误，去后台开即可）
create extension if not exists pg_cron;

-- 2. 清理同名旧任务，保证可重复执行
do $$
begin
  perform cron.unschedule('fmb-refresh-expiry');
exception
  when others then null;  -- 任务不存在时忽略
end;
$$;

-- 3. 每天 16:00 UTC（= 北京时间次日 00:00）刷新一次
select cron.schedule(
  'fmb-refresh-expiry',
  '0 16 * * *',
  'select public.refresh_expiry_status();'
);

-- 4. 自检：能看到刚建的任务
select jobid, jobname, schedule, active
from cron.job
where jobname = 'fmb-refresh-expiry';
