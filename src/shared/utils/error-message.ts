/**
 * 把数据库 / Auth 的英文错误翻译成人话。
 * 原则：不把原始英文直接甩给用户；也不把服务端细节泄漏出去。
 */

const RPC_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: '登录状态已失效，请重新登录',
  BOX_NAME_REQUIRED: '请填写药箱名字',
  INVITE_CODE_INVALID: '邀请码不正确，或者这个药箱已经被删除',
  INVITE_CODE_EXHAUSTED: '邀请码生成失败，请稍后重试',
  ALREADY_MEMBER: '你已经在这个药箱里了',
  BOX_MEMBER_LIMIT: '这个药箱已经有 5 个人了，无法再加入',
  NOT_BOX_MEMBER: '你不是这个药箱的成员',
  NOT_BOX_CREATOR: '只有创建者可以做这个操作',
  CREATOR_MUST_TRANSFER: '你是创建者，请先把药箱转让给其他成员再退出',
  CANNOT_TRANSFER_TO_SELF: '不能转让给自己',
  TARGET_NOT_MEMBER: '对方不是这个药箱的成员',
  CANNOT_REMOVE_SELF: '不能移除你自己',
};

const AUTH_PATTERNS: { pattern: RegExp; text: string }[] = [
  { pattern: /Invalid login credentials/i, text: '邮箱或密码不正确' },
  { pattern: /User already registered/i, text: '这个邮箱已经注册过了，请直接登录' },
  { pattern: /Email not confirmed/i, text: '请先去邮箱点确认链接，再回来登录' },
  { pattern: /Password should be at least/i, text: '密码至少 6 位' },
  { pattern: /Unable to validate email address/i, text: '邮箱格式不正确' },
  { pattern: /Signups not allowed/i, text: '当前项目关闭了注册，请联系管理员' },
  { pattern: /rate limit|too many requests/i, text: '尝试太频繁了，请等一会儿再试' },
  { pattern: /Failed to fetch|Network request failed|NetworkError/i, text: '网络连不上，请检查网络后重试' },
];

function extractMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  if (error instanceof Error) return error.message;
  return '';
}

export function toUserMessage(error: unknown): string {
  const raw = extractMessage(error);
  if (!raw) return '操作失败，请稍后重试';

  for (const [code, text] of Object.entries(RPC_MESSAGES)) {
    if (raw.includes(code)) return text;
  }

  for (const { pattern, text } of AUTH_PATTERNS) {
    if (pattern.test(raw)) return text;
  }

  // 兜底：不把可能很长的服务端报文整段抛给用户
  return raw.length <= 60 ? raw : '操作失败，请稍后重试';
}
