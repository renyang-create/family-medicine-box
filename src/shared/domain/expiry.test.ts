import { describe, expect, it } from 'vitest';

import { buildExpiryLabel, getExpiryStatus } from './expiry';

const now = new Date(2026, 9, 19); // 本地 2026-10-19

describe('getExpiryStatus', () => {
  it('没填有效期视为正常', () => {
    expect(getExpiryStatus(null, now)).toBe('normal');
  });

  it('今天到期算临期（第 0 天）', () => {
    expect(getExpiryStatus('2026-10-19', now)).toBe('near_expiry');
  });

  it('第 30 天仍算临期', () => {
    expect(getExpiryStatus('2026-11-18', now)).toBe('near_expiry');
  });

  it('第 31 天算正常', () => {
    expect(getExpiryStatus('2026-11-19', now)).toBe('normal');
  });

  it('昨天已过期', () => {
    expect(getExpiryStatus('2026-10-18', now)).toBe('expired');
  });
});

describe('buildExpiryLabel', () => {
  it('过期返回「已过期 N 天」结构', () => {
    expect(buildExpiryLabel('2026-10-09', now)).toEqual({
      status: 'expired',
      prefix: '已过期',
      days: 10,
      suffix: '天',
    });
  });

  it('临期返回「N 天后过期」结构', () => {
    expect(buildExpiryLabel('2026-10-24', now)).toEqual({
      status: 'near_expiry',
      prefix: '',
      days: 5,
      suffix: '天后过期',
    });
  });

  it('正常或空值返回 null', () => {
    expect(buildExpiryLabel('2028-01-01', now)).toBeNull();
    expect(buildExpiryLabel(null, now)).toBeNull();
  });
});
