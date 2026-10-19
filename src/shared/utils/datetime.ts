/**
 * 日期/时区工具。
 *
 * 口径（全局统一，不要在各页面里另写一套）：
 * - 时间戳：数据库存 timestamptz（UTC），这里负责按「设备本地时区」展示。
 * - 日历日期：如有效期 expire_date，存 date 字符串 'YYYY-MM-DD'，不做 UTC 换算；
 *   「今天」永远取设备本地时区的今天。
 * - 天数差用 UTC 归一化计算，避免夏令时导致的 23/25 小时误差。
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** 取设备本地时区的日期键，如 2026-10-19 */
export function toLocalDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** 把本地日期键拆成数字（避免用 Date 解析 'YYYY-MM-DD' 时被当成 UTC） */
export function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error(`[datetime] 非法日期键: ${dateKey}`);
  }
  return { year, month, day };
}

/** 两个日期键之间的天数差（to - from） */
export function daysBetweenDateKeys(fromKey: string, toKey: string): number {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
  const toUtc = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((toUtc - fromUtc) / MS_PER_DAY);
}

/**
 * 距离目标日期还有多少天（相对设备本地时区的「今天」）。
 * 负数表示已经过期了多少天。
 */
export function daysUntilDateKey(targetKey: string, now: Date = new Date()): number {
  return daysBetweenDateKeys(toLocalDateKey(now), targetKey);
}

/** 时间戳 → 本地时区 'YYYY-MM-DD HH:mm' */
export function formatLocalDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return `${toLocalDateKey(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** 时间戳 → 本地时区 'YYYY-MM-DD' */
export function formatLocalDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return toLocalDateKey(date);
}
