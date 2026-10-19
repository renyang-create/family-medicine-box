/**
 * 症状标签词表。
 *
 * 约定：
 * - 只是「预设」，用户可以加自定义标签；预设只影响选择时的顺序和便利性。
 * - 文案集中在这里，页面不要内联（与 agent.ts 同一约定）。
 */
export const SYMPTOM_TAGS = [
  '发烧',
  '咳嗽',
  '咽痛',
  '鼻塞',
  '头痛',
  '肠胃不适',
  '腹泻',
  '过敏',
  '外伤',
  '失眠',
  '疼痛',
  '炎症',
] as const;

/** 单个药品最多几个标签（与数据库 medicines_tags_limit 一致） */
export const MAX_TAGS_PER_MEDICINE = 6;

/** 单个标签最大长度 */
export const MAX_TAG_LENGTH = 10;
