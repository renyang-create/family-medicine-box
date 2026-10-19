/**
 * 邀请码归一化：库里统一存大写 6 位，用户输入允许空格与大小写。
 * 服务端 join_box_by_invite_code 会用同样规则（upper + 去空格），两端必须一致。
 */

export const INVITE_CODE_LENGTH = 6;

/** 去掉所有空白字符并转大写 */
export function normalizeInviteCode(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

/** 归一化后是否为合法邀请码（字母数字，固定 6 位） */
export function isValidInviteCode(input: string): boolean {
  return new RegExp(`^[A-Z0-9]{${INVITE_CODE_LENGTH}}$`).test(normalizeInviteCode(input));
}

/** 展示用格式化：ABCDEF -> ABC DEF，便于口头传达 */
export function formatInviteCodeForDisplay(code: string): string {
  const normalized = normalizeInviteCode(code);
  if (normalized.length !== INVITE_CODE_LENGTH) return normalized;
  return `${normalized.slice(0, 3)} ${normalized.slice(3)}`;
}
