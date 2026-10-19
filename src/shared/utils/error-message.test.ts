import { describe, expect, it } from 'vitest';

import { toUserMessage } from './error-message';

describe('toUserMessage', () => {
  it('翻译 RPC 业务错误码', () => {
    expect(toUserMessage({ message: 'BOX_MEMBER_LIMIT' })).toBe('这个药箱已经有 5 个人了，无法再加入');
    expect(toUserMessage(new Error('ALREADY_MEMBER'))).toBe('你已经在这个药箱里了');
    expect(toUserMessage({ message: 'CREATOR_MUST_TRANSFER' })).toContain('转让');
  });

  it('翻译常见 Auth 错误', () => {
    expect(toUserMessage({ message: 'Invalid login credentials' })).toBe('邮箱或密码不正确');
    expect(toUserMessage({ message: 'Email not confirmed' })).toContain('确认链接');
  });

  it('未知的长报文不透传给用户', () => {
    expect(toUserMessage({ message: 'x'.repeat(200) })).toBe('操作失败，请稍后重试');
  });

  it('空错误给通用提示', () => {
    expect(toUserMessage(null)).toBe('操作失败，请稍后重试');
    expect(toUserMessage('')).toBe('操作失败，请稍后重试');
  });
});
