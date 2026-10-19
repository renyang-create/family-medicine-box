/**
 * 有效期相关的唯一口径（阈值 / 枚举 / 视觉 token）。
 *
 * 业务判定逻辑在 src/shared/domain/expiry.ts，两边共用这里的常量。
 *
 * 规则（基准 = 设备本地时区的「今天」）：
 * - expired：expire_date < 今天
 * - near_expiry：0 <= 距离到期 <= 30 天
 * - normal：其余
 *
 * 注意：数据库的 expiry_status 由 pg_cron 用 UTC 刷新，只作服务端辅助；
 *       UI 必须用本地时区实时判定，避免跨零点/跨时区出现矛盾状态。
 */

/** 临期阈值：距离到期 30 天（含第 30 天） */
export const EXPIRY_NEAR_DAYS = 30;

export type ExpiryStatus = 'normal' | 'near_expiry' | 'expired';

/**
 * 视觉 token。键名与 ExpiryStatus 完全一致，便于直接用状态取值。
 * 过期必须「红得醒目」：红色竖条 + 淡红底 + 红字，且数字 N 单独用 danger 色。
 */
export const EXPIRY_COLORS: Record<
  ExpiryStatus,
  { border: string; background: string; text: string; number: string }
> = {
  expired: {
    border: '#D92D20',
    background: '#FEF3F2',
    text: '#B42318',
    /** 「已过期 N 天」里的 N */
    number: '#D92D20',
  },
  near_expiry: {
    border: '#F79009',
    background: '#FEF0C7',
    text: '#B54708',
    /** 「N 天后过期」里的 N 也要求红色 */
    number: '#D92D20',
  },
  normal: {
    border: 'transparent',
    background: 'transparent',
    text: '#667085',
    number: '#667085',
  },
};

/** 标签文案模板：{n} 会被替换为天数，并在 UI 中用 danger 色单独渲染 */
export const EXPIRY_LABEL_TEMPLATE: Record<'expired' | 'near_expiry', string> = {
  expired: '已过期 {n} 天',
  near_expiry: '{n} 天后过期',
};
