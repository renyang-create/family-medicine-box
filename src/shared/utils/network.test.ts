import { describe, expect, it } from 'vitest';

import { isNetworkError } from './network';

describe('isNetworkError', () => {
  it('识别 fetch 层断网错误', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('Network request failed'))).toBe(true);
    expect(isNetworkError(new Error('fetch failed'))).toBe(true);
  });

  it('识别超时中断', () => {
    const error = new Error('aborted');
    error.name = 'AbortError';
    expect(isNetworkError(error)).toBe(true);
  });

  it('识别 Supabase 对象上的 details / hint', () => {
    expect(isNetworkError({ message: '', details: 'NetworkError when attempting to fetch' })).toBe(
      true,
    );
  });

  it('识别嵌套的 cause', () => {
    expect(isNetworkError({ message: 'request failed', cause: new Error('ECONNREFUSED') })).toBe(
      true,
    );
  });

  it('业务错误不算网络错误', () => {
    expect(isNetworkError(new Error('duplicate key value violates unique constraint'))).toBe(false);
    expect(isNetworkError({ message: 'new row violates row-level security policy' })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});
