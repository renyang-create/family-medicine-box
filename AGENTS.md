# AGENTS.md · 给 AI 的硬约束

本项目是「家庭药箱」App（Expo + React Native + TypeScript + Supabase）。
以下规则**不可协商**，与任何临时需求冲突时以本文件为准。

## 1. 安全

- 禁止硬编码任何密钥；禁止读取/输出私钥；`.env*` 不入库（`.env.example` 除外）。
- AI 密钥只存在于 Supabase Edge Function secrets，**前端代码不得读取原始密钥**。
- 客户端只允许 `EXPO_PUBLIC_*`，且仅限 `SUPABASE_URL` / `SUPABASE_ANON_KEY`。
- 只操作本仓库，不读取/修改其他仓库。

## 2. 数据库与权限

- 所有表的 RLS 策略必须用 `auth.uid()` 校验身份；**禁止**用前端传入的 `user_id` 作为身份依据。
- 药箱隔离通过 `box_members` 实现：读写一律经过 `is_box_member()` / `is_box_creator()`。
- 业务表必须有 `is_deleted boolean not null default false`；**不给 DELETE 权限**，删除只做软删。
- 邀请码：6 位、全局唯一、库内大写；输入侧 `upper(replace(...,' ',''))` 归一化。
- 库存扣减只能在 RPC 内完成，且 `quantity >= 0`；为 0 时只写服药日志。

## 3. 业务规则

- 每箱最多 5 人（并发下用锁 + 计数，不能只靠前端）。
- 药箱不能无主：创建者退出前必须转让；仅剩一人时只能解散（级联软删）。
- 吃药计划（MedicationPlan）**仅创建者可见**；提醒实例（Reminder）由 expo-notifications 消费。
- 排序：已过期置顶（过期最久在前）→ 有服药记录按 `last_taken_at` 倒序 → 无记录排末尾。
- 临期 = 距到期 ≤ 30 天；过期 = 已过有效期；判定基准是**设备本地时区**。

## 4. 前端

- 任阳相关文案只在 `src/shared/constants/agent.ts`，页面禁止内联。
- 免责声明是静态常量：不得由 AI 生成；每条 AI 回复下方固定渲染。
- 时间戳统一按本地时区展示，统一走 `src/shared/utils/datetime.ts`。
- 不要在页面里直接调用 `supabase` 客户端做业务写操作，走 features 层的 hooks/RPC。

## 5. 流程

- 每次改动后跑 `npm run verify`（typecheck + lint + test + check:secrets）。
- 不擅自扩大范围：按 T1→T9 任务卡推进，未确认不实现下一阶段功能。
