/**
 * 「每天几点」的时间标签处理（纯函数，带单测）。
 * 约定：一律用 24 小时制 'HH:mm'，存库也是这个格式（由数据库 CHECK 保证）。
 */

const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function isValidTimeLabel(value: string): boolean {
  return TIME_PATTERN.test(value.trim());
}

/** 规范化：去掉空白，补零，如 '8:5' -> '08:05'；非法返回 null */
export function normalizeTimeLabel(value: string): string | null {
  const raw = value.trim();
  const matched = raw.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!matched) return null;

  const hour = Number(matched[1]);
  const minute = Number(matched[2]);
  if (hour > 23 || minute > 59) return null;

  const hh = hour < 10 ? `0${hour}` : String(hour);
  const mm = minute < 10 ? `0${minute}` : String(minute);
  return `${hh}:${mm}`;
}

/** 排序用：'08:00' -> 480 */
export function timeLabelToMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

/** 去重 + 升序 */
export function sortTimeLabels(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => timeLabelToMinutes(a) - timeLabelToMinutes(b));
}

/** 下一次触发时间（用于展示「下次提醒 明天 08:00」） */
export function nextOccurrence(label: string, now: Date = new Date()): Date {
  const [hour, minute] = label.split(':').map(Number);
  const next = new Date(now);
  next.setHours(hour ?? 0, minute ?? 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}
