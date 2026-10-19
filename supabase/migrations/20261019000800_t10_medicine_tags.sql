-- ============================================================
-- 家庭药箱 · T10：药品症状标签
-- 执行：Supabase Dashboard → SQL Editor → 粘贴整段 → Run
-- 幂等：可重复执行
--
-- 设计说明：标签直接存成 medicines.tags text[]，不建关联表。
--   1. 打标签 = 一次行更新，天然契合离线 outbox（不需要先建标签再建关联）
--   2. 筛选在客户端做（药箱列表本来就一次取全量），省掉 join 与额外 RLS
--   3. 代价：标签没有独立的「重命名 / 删除」入口，改名需逐条改药品
-- ============================================================

alter table public.medicines
  add column if not exists tags text[] not null default '{}';

-- 数量上限与前端 MAX_TAGS_PER_MEDICINE 保持一致（6）
alter table public.medicines
  drop constraint if exists medicines_tags_limit;
alter table public.medicines
  add constraint medicines_tags_limit
  check (tags is null or array_length(tags, 1) is null or array_length(tags, 1) <= 6);

-- 空字符串 / NULL 元素一律禁止（前端会归一化，这里是兜底）
alter table public.medicines
  drop constraint if exists medicines_tags_clean;
alter table public.medicines
  add constraint medicines_tags_clean
  check (tags is null or not ('' = any (tags)));

-- 按标签筛（服务端将来做分页时可直接用 @> 查询）
create index if not exists idx_medicines_tags
  on public.medicines using gin (tags)
  where is_deleted = false;

-- 自检
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'medicines' and column_name = 'tags') = 1
  and (select count(*) from pg_constraint
    where conname in ('medicines_tags_limit', 'medicines_tags_clean')) = 2
  and (select count(*) from pg_indexes
    where schemaname = 'public' and indexname = 'idx_medicines_tags') = 1
  as t10_ok;
