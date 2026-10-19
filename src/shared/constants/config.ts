/** 全局业务常量：能写死在代码里、但需要「一处修改」的值都放这里 */

/** 每个药箱最多 5 人（数据库侧还有触发器 + 幂等校验兜底） */
export const BOX_MEMBER_LIMIT = 5;

/** 邀请码长度（数据库强制大写 + 全局唯一） */
export const INVITE_CODE_LENGTH = 6;

/** 智能体：每用户每日提问上限（服务端原子计数，前端只做展示） */
export const AI_DAILY_QUOTA = 20;

/** 智能体：单条输入最大字符数 */
export const AI_MAX_INPUT_CHARS = 300;

/** 智能体：单次回复最大 token */
export const AI_MAX_OUTPUT_TOKENS = 400;

/** 智能体：请求超时（超时即降级，不让用户干等） */
export const AI_REQUEST_TIMEOUT_MS = 8_000;

/** 药品列表默认分页大小（客户端排序场景下先取全量，超过则分页） */
export const MEDICINE_PAGE_SIZE = 50;
