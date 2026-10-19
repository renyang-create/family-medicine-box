import { describe, expect, it } from 'vitest';

import {
  daysBetweenDateKeys,
  daysUntilDateKey,
  formatLocalDateTime,
  parseDateKey,
  toLocalDateKey,
} from './datetime';

describe('toLocalDateKey', () => {
  it('补零输出设备本地日期', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toLocalDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('parseDateKey', () => {
  it('按字面拆解，不受时区影响', () => {
    expect(parseDateKey('2027-03-31')).toEqual({ year: 2027, month: 3, day: 31 });
  });

  it('非法输入直接抛错', () => {
    expect(() => parseDateKey('2027-00-00')).toThrow();
  });
});

describe('daysBetweenDateKeys', () => {
  it('跨月与跨年计算正确', () => {
    expect(daysBetweenDateKeys('2026-10-19', '2026-11-18')).toBe(30);
    expect(daysBetweenDateKeys('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('目标早于基准时为负数', () => {
    expect(daysBetweenDateKeys('2026-10-19', '2026-10-01')).toBe(-18);
  });
});

describe('daysUntilDateKey', () => {
  const now = new Date(2026, 9, 19, 23, 30); // 本地 2026-10-19 23:30

  it('同一天为 0（临期第 30 天的边界）', () => {
    expect(daysUntilDateKey('2026-10-19', now)).toBe(0);
  });

  it('第 30 天仍是临期区间', () => {
    expect(daysUntilDateKey('2026-11-18', now)).toBe(30);
  });

  it('第 31 天已超出临期区间', () => {
    expect(daysUntilDateKey('2026-11-19', now)).toBe(31);
  });

  it('过期为负数', () => {
    expect(daysUntilDateKey('2026-10-09', now)).toBe(-10);
  });
});

describe('formatLocalDateTime', () => {
  it('按本机时区格式化，非法值返回空串', () => {
    const local = new Date(2026, 9, 19, 8, 5);
    expect(formatLocalDateTime(local)).toBe('2026-10-19 08:05');
    expect(formatLocalDateTime('not-a-date')).toBe('');
  });
});
