import { describe, expect, it } from 'vitest';

import { groupByExpiry } from './expiry-groups';

const now = new Date(2026, 9, 19); // 本地 2026-10-19

type Item = { id: string; expireDate: string | null };

describe('groupByExpiry', () => {
  it('分成过期与临期两组，正常药品被忽略', () => {
    const items: Item[] = [
      { id: 'a', expireDate: '2026-08-01' },
      { id: 'b', expireDate: '2026-10-28' },
      { id: 'c', expireDate: '2028-01-01' },
      { id: 'd', expireDate: null },
    ];

    const groups = groupByExpiry(items, now);
    expect(groups.expired.map((item) => item.id)).toEqual(['a']);
    expect(groups.nearExpiry.map((item) => item.id)).toEqual(['b']);
    expect(groups.total).toBe(2);
  });

  it('组内按有效期升序：过期最久的在前、临期最快到期的在前', () => {
    const items: Item[] = [
      { id: 'exp-late', expireDate: '2026-10-18' },
      { id: 'exp-early', expireDate: '2026-01-01' },
      { id: 'near-far', expireDate: '2026-11-15' },
      { id: 'near-near', expireDate: '2026-10-20' },
    ];

    const groups = groupByExpiry(items, now);
    expect(groups.expired.map((item) => item.id)).toEqual(['exp-early', 'exp-late']);
    expect(groups.nearExpiry.map((item) => item.id)).toEqual(['near-near', 'near-far']);
  });

  it('全部正常时总数为 0', () => {
    const groups = groupByExpiry([{ id: 'x', expireDate: '2029-01-01' }], now);
    expect(groups.total).toBe(0);
    expect(groups.expired).toHaveLength(0);
    expect(groups.nearExpiry).toHaveLength(0);
  });

  it('第 30 天算临期，第 31 天不算', () => {
    const groups = groupByExpiry(
      [
        { id: 'day30', expireDate: '2026-11-18' },
        { id: 'day31', expireDate: '2026-11-19' },
      ],
      now,
    );
    expect(groups.nearExpiry.map((item) => item.id)).toEqual(['day30']);
  });
});
