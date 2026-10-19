/**
 * 判断一个错误是不是「网络不通」造成的。
 *
 * 为什么要自己判断：Supabase JS 在断网时抛的是 fetch 层错误
 * （`TypeError: Failed to fetch` / React Native 的 `Network request failed`），
 * 没有稳定的 error code 可用，只能按文案匹配。
 *
 * 这类错误是可以「排队等联网重试」的；其它错误（RLS、校验、唯一键冲突）
 * 重试多少次都不会成功，必须直接报给用户。
 */
const NETWORK_PATTERNS = [
  'failed to fetch',
  'network request failed',
  'networkerror',
  'network error',
  'fetch failed',
  'load failed',
  'timeout',
  'timed out',
  'econnrefused',
  'econnreset',
  'enotfound',
  'etimedout',
  'internet connection appears to be offline',
  'network connection was lost',
  'the request timed out',
];

export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === 'string') {
    return matchPattern(error);
  }

  const candidate = error as {
    name?: string;
    message?: string;
    details?: string;
    hint?: string;
    cause?: unknown;
  };

  // 超时中断（Edge Function 的 AbortController 也会走这里）
  if (candidate.name === 'AbortError' || candidate.name === 'TimeoutError') return true;

  const text = [candidate.message, candidate.details, candidate.hint]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' ');

  if (matchPattern(text)) return true;

  return candidate.cause ? isNetworkError(candidate.cause) : false;
}

function matchPattern(text: string): boolean {
  const lower = text.toLowerCase();
  return NETWORK_PATTERNS.some((pattern) => lower.includes(pattern));
}
