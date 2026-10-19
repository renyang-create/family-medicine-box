import { describe, expect, it } from 'vitest';

import { sortMedicines } from './medicine-sort';

const now = new Date(2026, 9, 19); // 本地 2026-10-19

type Item = { name: string; expireDate: string | null; lastTakenAt: string | null };

function names(items: Item[]): string[] {
  return items.map((item) => item.name);
}

describe('sortMedicines', () => {
  it('过期药品置顶，且过期最久的在前', () => {
    const items: Item[] = [
      { name: '刚过期', expireDate: '2026-10-10', lastTakenAt: '2026-10-18T10:00:00Z' },
      { name: '正常甲', expireDate: '2027-06-01', lastTakenAt: '2026-10-19T08:00:00Z' },
      { name: '过期很久', expireDate: '2026-01-01', lastTakenAt: null },
    ];

    expect(names(sortMedicines(items, now))).toEqual(['过期很久', '刚过期', '正常甲']);
  });

  it('非过期组按最近服药时间倒序', () => {
    const items: Item[] = [
      { name: '三天前', expireDate: null, lastTakenAt: '2026-10-16T10:00:00Z' },
      { name: '刚刚', expireDate: null, lastTakenAt: '2026-10-19T09:00:00Z' },
      { name: '昨天', expireDate: null, lastTakenAt: '2026-10-18T10:00:00Z' },
    ];

    expect(names(sortMedicines(items, now))).toEqual(['刚刚', '昨天', '三天前']);
  });

  it('从未服用的统一排在末尾', () => {
    const items: Item[] = [
      { name: '没吃过A', expireDate: null, lastTakenAt: null },
      { name: '吃过', expireDate: null, lastTakenAt: '2026-10-17T10:00:00Z' },
      { name: '没吃过B', expireDate: null, lastTakenAt: null },
    ];

    expect(names(sortMedicines(items, now))).toEqual(['吃过', '没吃过A', '没吃过B']);
  });

  it('临期不参与置顶，只按服药时间排', () => {
    const items: Item[] = [
      { name: '临期', expireDate: '2026-11-10', lastTakenAt: null },
      { name: '吃过正常', expireDate: '2028-01-01', lastTakenAt: '2026-10-18T10:00:00Z' },
    ];

    expect(names(sortMedicines(items, now))).toEqual(['吃过正常', '临期']);
  });

  it('不修改传入数组', () => {
    const items: Item[] = [
      { name: 'B', expireDate: null, lastTakenAt: null },
      { name: 'A', expireDate: null, lastTakenAt: null },
    ];
    const sorted = sortMedicines(items, now);
    expect(names(items)).toEqual(['B', 'A']);
    expect(names(sorted)).toEqual(['A', 'B']);
  });
});
