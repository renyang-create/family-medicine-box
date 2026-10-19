import { describe, expect, it } from 'vitest';

import {
  formatInviteCodeForDisplay,
  isValidInviteCode,
  normalizeInviteCode,
} from './normalize-invite-code';

describe('normalizeInviteCode', () => {
  it('去空格并转大写', () => {
    expect(normalizeInviteCode(' ab12cd ')).toBe('AB12CD');
    expect(normalizeInviteCode('ab 12\tcd')).toBe('AB12CD');
  });

  it('非 ASCII 字符保持原样（由 isValid 拦住）', () => {
    expect(normalizeInviteCode('ａｂｃ１２３')).toBe('ＡＢＣ１２３');
  });
});

describe('isValidInviteCode', () => {
  it('接受 6 位字母数字（含空格/小写）', () => {
    expect(isValidInviteCode('ab12cd')).toBe(true);
    expect(isValidInviteCode(' AB 12 CD ')).toBe(true);
  });

  it('拒绝长度不符或含特殊字符', () => {
    expect(isValidInviteCode('ab12c')).toBe(false);
    expect(isValidInviteCode('ab12cd7')).toBe(false);
    expect(isValidInviteCode('ab-12cd')).toBe(false);
  });
});

describe('formatInviteCodeForDisplay', () => {
  it('按 3+3 分组展示', () => {
    expect(formatInviteCodeForDisplay('ab12cd')).toBe('AB1 2CD');
  });

  it('长度不符时原样返回归一化结果', () => {
    expect(formatInviteCodeForDisplay('ab12')).toBe('AB12');
  });
});
