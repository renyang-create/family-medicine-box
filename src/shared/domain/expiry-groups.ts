import { getExpiryStatus } from './expiry';

export type ExpiryGroupable = {
  expireDate: string | null;
};

export type ExpiryGroups<T extends ExpiryGroupable> = {
  expired: T[];
  nearExpiry: T[];
  /** 需要提醒的总数（过期 + 临期） */
  total: number;
};

/**
 * 把药品分成「已过期」和「临期」两组，用于首页徽标与提醒列表。
 * 组内都按有效期升序：过期最久的在前；临期里最快到期的在前。
 */
export function groupByExpiry<T extends ExpiryGroupable>(
  items: T[],
  now: Date = new Date(),
): ExpiryGroups<T> {
  const expired: T[] = [];
  const nearExpiry: T[] = [];

  for (const item of items) {
    const status = getExpiryStatus(item.expireDate, now);
    if (status === 'expired') expired.push(item);
    else if (status === 'near_expiry') nearExpiry.push(item);
  }

  const byExpireAsc = (a: T, b: T): number => {
    const left = a.expireDate ?? '';
    const right = b.expireDate ?? '';
    if (left === right) return 0;
    return left < right ? -1 : 1;
  };

  expired.sort(byExpireAsc);
  nearExpiry.sort(byExpireAsc);

  return { expired, nearExpiry, total: expired.length + nearExpiry.length };
}
