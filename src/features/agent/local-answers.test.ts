import { describe, expect, it } from 'vitest';

import { findLocalAnswer, LOCAL_FALLBACK_ANSWER } from './local-answers';

describe('findLocalAnswer', () => {
  it('命中「过期」相关常识', () => {
    const answer = findLocalAnswer('过期药还能吃吗');
    expect(answer).toBeTruthy();
    expect(answer).toContain('不建议');
  });

  it('命中「漏服」相关常识', () => {
    const answer = findLocalAnswer('我今天忘吃了怎么办');
    expect(answer).toContain('双倍');
  });

  it('多个关键词命中时优先取命中更多的', () => {
    const answer = findLocalAnswer('喝酒 相互作用');
    expect(answer).toContain('酒');
  });

  it('未命中返回 null（由调用方决定要不要用兜底话术）', () => {
    expect(findLocalAnswer('今天天气怎么样')).toBeNull();
    expect(findLocalAnswer('')).toBeNull();
  });

  it('兜底话术不含具体用药建议', () => {
    expect(LOCAL_FALLBACK_ANSWER).toContain('药师');
    expect(LOCAL_FALLBACK_ANSWER).not.toContain('毫克');
  });
});
