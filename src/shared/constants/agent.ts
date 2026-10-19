/**
 * 智能体「任阳」的全部对外文案。
 *
 * 规则：
 * - 页面禁止内联这些字符串，改字只改本文件。
 * - 免责声明是「固定静态文案」：不得由 AI 生成，不得动态拼接。
 * - AGENT_NAME 只描述一个 AI 助手，不要让它被包装成真人医生。
 */

export const AGENT_NAME = '任阳';
export const AGENT_TAGLINE = 'AI 助手 · 用药参考，不做诊断';

/** 首页入口主文案 */
export const HOME_AGENT_CTA = '不知道吃什么药？来问问任阳吧';
export const HOME_AGENT_SUB = '任阳只能给一般参考，不能替代医生药师';

/** 智能体页顶部常驻免责横幅 */
export const AGENT_DISCLAIMER_TOP =
  '我是 AI 助手任阳，只能提供一般用药参考，不能替代医生或药师。如有不适请及时就医。';

/** 每一条 AI 回复下方固定渲染的免责提示 */
export const AGENT_DISCLAIMER_PER_REPLY =
  '以上内容由任阳生成，仅供参考，不构成诊疗建议，用药请遵医嘱。';

/** 额度耗尽（前端与服务端使用同一句，避免两种口径） */
export const AGENT_QUOTA_EXCEEDED = '任阳今天的问题额度用完了，明天再来问问我吧';

/** 上游不可用时的兜底话术（不暴露任何上游错误细节） */
export const AGENT_UNAVAILABLE = '任阳现在有点忙，请稍后再问';

/** 空态推荐问题：点了直接发问 */
export const AGENT_PRESET_QUESTIONS = [
  '过期药还能吃吗？',
  '漏吃一次怎么办？',
  '服药期间能喝酒吗？',
  '退烧药多久吃一次？',
];
