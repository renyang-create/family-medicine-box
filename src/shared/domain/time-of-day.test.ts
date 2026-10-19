import { describe, expect, it } from 'vitest';

import {
  isValidTimeLabel,
  nextOccurrence,
  normalizeTimeLabel,
  sortTimeLabels,
  timeLabelToMinutes,
} from './time-of-day';

describe('isValidTimeLabel', () => {
  it('接受 24 小时制 HH:mm', () => {
    expect(isValidTimeLabel('08:00')).toBe(true);
    expect(isValidTimeLabel('23:59')).toBe(true);
    expect(isValidTimeLabel('00:00')).toBe(true);
  });

  it('拒绝越界或格式错误', () => {
    expect(isValidTimeLabel('24:00')).toBe(false);
    expect(isValidTimeLabel('8:00')).toBe(false);
    expect(isValidTimeLabel('08:60')).toBe(false);
    expect(isValidTimeLabel('0800')).toBe(false);
  });
});

describe('normalizeTimeLabel', () => {
  it('补零并去掉空白', () => {
    expect(normalizeTimeLabel(' 8:5 ')).toBe('08:05');
    expect(normalizeTimeLabel('20:30')).toBe('20:30');
  });

  it('非法输入返回 null', () => {
    expect(normalizeTimeLabel('25:00')).toBeNull();
    expect(normalizeTimeLabel('aa:bb')).toBeNull();
  });
});

describe('sortTimeLabels', () => {
  it('去重并按时间升序', () => {
    expect(sortTimeLabels(['20:00', '08:00', '20:00', '12:30'])).toEqual([
      '08:00',
      '12:30',
      '20:00',
    ]);
  });

  it('timeLabelToMinutes 换算正确', () => {
    expect(timeLabelToMinutes('08:30')).toBe(510);
  });
});

describe('nextOccurrence', () => {
  const now = new Date(2026, 9, 19, 9, 0); // 本地 10-19 09:00

  it('今天还没到点就用今天', () => {
    const next = nextOccurrence('20:00', now);
    expect(next.getDate()).toBe(19);
    expect(next.getHours()).toBe(20);
  });

  it('今天已过点就顺延到明天', () => {
    const next = nextOccurrence('08:00', now);
    expect(next.getDate()).toBe(20);
    expect(next.getHours()).toBe(8);
  });
});
