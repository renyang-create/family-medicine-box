import { MAX_TAGS_PER_MEDICINE, MAX_TAG_LENGTH } from '@/shared/constants/tags';

/**
 * 标签纯逻辑（带单测）：
 * - 归一化：去首尾空白、内部连续空白压成一个空格、截断超长
 * - 去重：忽略大小写差异，保留第一次出现的写法
 * - 筛选：多选时取「任一命中」（OR），空选表示不过滤
 */

/** 归一化单个标签；返回空字符串表示这个标签无效 */
export function normalizeTag(raw: string): string {
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  if (!collapsed) return '';
  return collapsed.slice(0, MAX_TAG_LENGTH);
}

/** 清洗标签数组：归一化 → 去空 → 去重（忽略大小写）→ 截断数量 */
export function sanitizeTags(raw: readonly string[] | null | undefined): string[] {
  if (!raw || raw.length === 0) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of raw) {
    const tag = normalizeTag(item);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length >= MAX_TAGS_PER_MEDICINE) break;
  }

  return result;
}

export function hasTag(tags: readonly string[], tag: string): boolean {
  const target = normalizeTag(tag).toLowerCase();
  return tags.some((item) => normalizeTag(item).toLowerCase() === target);
}

/**
 * 点一下切换标签。
 * 已达上限时「加」无效，返回原数组（调用方可用长度判断是否被拒）。
 */
export function toggleTag(tags: readonly string[], tag: string): string[] {
  const normalized = normalizeTag(tag);
  if (!normalized) return sanitizeTags(tags);

  if (hasTag(tags, normalized)) {
    return tags.filter((item) => normalizeTag(item).toLowerCase() !== normalized.toLowerCase());
  }

  if (sanitizeTags(tags).length >= MAX_TAGS_PER_MEDICINE) return sanitizeTags(tags);
  return sanitizeTags([...tags, normalized]);
}

/** 汇总一组药品用到的标签：按出现次数倒序，次数相同按名称排序 */
export function collectTags(items: readonly { tags: readonly string[] }[]): string[] {
  const counter = new Map<string, number>();

  for (const item of items) {
    for (const tag of sanitizeTags(item.tags)) {
      counter.set(tag, (counter.get(tag) ?? 0) + 1);
    }
  }

  return [...counter.entries()]
    .sort((a, b) => (b[1] === a[1] ? a[0].localeCompare(b[0], 'zh-Hans-CN') : b[1] - a[1]))
    .map(([tag]) => tag);
}

/** 汇总标签 + 每个标签被多少个药品使用（标签管理页用） */
export function collectTagCounts(
  items: readonly { tags: readonly string[] }[],
): { tag: string; count: number }[] {
  const counter = new Map<string, number>();

  for (const item of items) {
    for (const tag of sanitizeTags(item.tags)) {
      counter.set(tag, (counter.get(tag) ?? 0) + 1);
    }
  }

  return [...counter.entries()]
    .sort((a, b) => (b[1] === a[1] ? a[0].localeCompare(b[0], 'zh-Hans-CN') : b[1] - a[1]))
    .map(([tag, count]) => ({ tag, count }));
}

/** 是否命中选中标签（空选 = 全部命中） */
export function matchesTags(tags: readonly string[], selected: readonly string[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((tag) => hasTag(tags, tag));
}

/** 按标签筛选药品；多选为「任一命中」，不改变入参 */
export function filterByTags<T extends { tags: readonly string[] }>(
  items: readonly T[],
  selected: readonly string[],
): T[] {
  if (selected.length === 0) return [...items];
  return items.filter((item) => matchesTags(item.tags, selected));
}
