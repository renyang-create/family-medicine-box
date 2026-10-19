import { getExpiryStatus } from './expiry';

/**
 * 药品列表排序规则（纯函数，带单测）。
 *
 * 优先级：
 * 1. 已过期置顶（组内按有效期升序 —— 过期最久的在最前）
 * 2. 其余按 last_taken_at 倒序（最近吃过的最靠上）
 * 3. 从未吃过的（last_taken_at 为 null）统一排在末尾
 * 4. 同条件按名称升序，保证顺序稳定
 */

export type SortableMedicine = {
  name: string;
  expireDate: string | null;
  lastTakenAt: string | null;
};

function compareName(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function sortMedicines<T extends SortableMedicine>(items: T[], now: Date = new Date()): T[] {
  return [...items].sort((a, b) => {
    const aExpired = getExpiryStatus(a.expireDate, now) === 'expired';
    const bExpired = getExpiryStatus(b.expireDate, now) === 'expired';

    // 1. 过期优先
    if (aExpired !== bExpired) return aExpired ? -1 : 1;

    // 2. 过期组内：有效期早的在前（过期最久）
    if (aExpired && bExpired) {
      const aDate = a.expireDate ?? '';
      const bDate = b.expireDate ?? '';
      if (aDate !== bDate) return aDate < bDate ? -1 : 1;
      return compareName(a.name, b.name);
    }

    // 3. 非过期组：最近服药倒序，无记录排末尾
    const aTaken = a.lastTakenAt;
    const bTaken = b.lastTakenAt;
    if (aTaken !== bTaken) {
      if (!aTaken) return 1;
      if (!bTaken) return -1;
      return aTaken > bTaken ? -1 : 1;
    }

    // 4. 稳定兜底
    return compareName(a.name, b.name);
  });
}
