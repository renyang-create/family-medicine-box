import { EXPIRY_NEAR_DAYS } from '@/shared/constants/expiry';
import type { ExpiryStatus } from '@/shared/constants/expiry';
import { daysUntilDateKey } from '@/shared/utils/datetime';

/**
 * 有效期判定（纯函数，UI 与服务端口径一致）。
 * 阈值与颜色 token 见 src/shared/constants/expiry.ts。
 */

export type { ExpiryStatus } from '@/shared/constants/expiry';

export function getExpiryStatus(expireDate: string | null, now: Date = new Date()): ExpiryStatus {
  if (!expireDate) return 'normal';
  const days = daysUntilDateKey(expireDate, now);
  if (days < 0) return 'expired';
  if (days <= EXPIRY_NEAR_DAYS) return 'near_expiry';
  return 'normal';
}

export type ExpiryLabel = {
  status: 'expired' | 'near_expiry';
  /** 文案前缀，如「已过期」 */
  prefix: string;
  /** 需要单独标红的天数 */
  days: number;
  /** 文案后缀，如「天」或「天后过期」 */
  suffix: string;
};

/**
 * 生成「已过期 12 天」/「5 天后过期」的结构化文案。
 * 天数单独返回，方便 UI 把 N 用红色加粗渲染。
 */
export function buildExpiryLabel(
  expireDate: string | null,
  now: Date = new Date(),
): ExpiryLabel | null {
  if (!expireDate) return null;

  const days = daysUntilDateKey(expireDate, now);

  if (days < 0) {
    return { status: 'expired', prefix: '已过期', days: Math.abs(days), suffix: '天' };
  }
  if (days <= EXPIRY_NEAR_DAYS) {
    return { status: 'near_expiry', prefix: '', days, suffix: '天后过期' };
  }
  return null;
}
