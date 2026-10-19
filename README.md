# 家庭药箱（family-medicine-box）

和家人共享药箱：药品、有效期、服药记录、吃药提醒，以及 AI 助手「任阳」。

> 当前进度：**T3 登录与药箱**。
> 已完成：T1 项目骨架（路由 / Provider / 常量 / 密钥闸门）、T2 数据库（`profiles` / `medicine_boxes` / `box_members` + RLS + 药箱 RPC）、T3 邮箱登录、首页药箱列表、创建 / 邀请码加入、退出登录。
> 待接入：药品 CRUD（T4）、服药记录与排序（T5）、过期提醒（T6）、本地通知（T8）、任阳问答（T9）。

## 技术栈

| 层 | 选型 |
|---|---|
| App | React Native + Expo（SDK 58）+ TypeScript |
| 路由 | Expo Router（`src/app`） |
| 服务端状态 | TanStack Query + AsyncStorage 持久化（离线基础） |
| 客户端状态 | Zustand |
| 后端 / 数据库 / 鉴权 | Supabase（Postgres + Auth + RLS + Edge Functions + pg_cron） |
| 本地通知 | expo-notifications（T8 接入） |
| AI | 经 Supabase Edge Function 代理（密钥只存服务端 secrets） |

## 环境要求

- Node **≥ 22.13**（RN 0.88 的 engines 要求；本机若为 22.12 会出 `EBADENGINE` 警告，建议升级）
- npm（Expo 默认链路）

## 快速开始

```bash
npm install
cp .env.example .env.local   # 填入你的 Supabase URL 与 anon key
npm start
```

`.env.local` 只允许 `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`。
**service role key 与任何 AI 密钥都不得出现在客户端**（见「安全约定」）。

## 验证（提交前必须全绿）

```bash
npm run verify   # = typecheck + lint + test + check:secrets
```

单项：

```bash
npm run typecheck
npm run lint
npm run test
npm run check:secrets
npm run verify
```

## 目录结构

```
src/
├─ app/                 # 路由（Expo Router）
│  ├─ _layout.tsx       # Provider 分层：Query → Auth → Theme
│  ├─ index.tsx         # 启动分流（有会话进 tabs）
│  ├─ (auth)/           # 未登录区域
│  └─ (tabs)/           # 药箱 / 任阳 / 设置
├─ lib/                 # supabase 客户端、query-client、env
├─ providers/           # QueryProvider / AuthProvider
└─ shared/
   ├─ constants/        # 任阳文案、有效期口径、业务阈值
   ├─ ui/               # 设计 token + 基础组件
   └─ utils/            # 时区/日期、邀请码归一化（含单测）
supabase/migrations/    # T2 起写库表与 RLS
scripts/check-secrets.mjs
```

## 关键约定（改代码前先读）

1. **文案不外泄到页面**：任阳相关文案只在 `src/shared/constants/agent.ts`。
2. **免责声明是静态常量**：不得由 AI 生成，每条 AI 回复下方固定渲染。
3. **日期口径**：时间戳存 `timestamptz`（UTC），展示按设备本地时区；有效期 `expire_date` 是日历日期，不做时区换算（见 `src/shared/utils/datetime.ts`）。
4. **临期/过期**：`expire_date - 今天(本地) ∈ [0, 30]` 为临期，`< 0` 为过期（`src/shared/constants/expiry.ts`）。
5. **权限只在数据库做**：所有表 RLS 用 `auth.uid()`；前端传的 `user_id` 不作为身份依据。
6. **软删除**：业务表只有 `is_deleted`，没有物理删除。
7. **排序**：已过期置顶（过期最久在前）→ 有服药记录按 `last_taken_at` 倒序 → 无记录排末尾。
8. **通知边界**：吃药提醒仅由 expo-notifications 本地调度；pg_cron 只批量刷新临期/过期状态，不发提醒。

## 安全约定

- 密钥不进仓库：`.gitignore` 已屏蔽 `.env*`（保留 `.env.example`）、keystore、`credentials.json`、`google-services.json`。
- `npm run check:secrets` 扫描 `src/`、`scripts/`、`app.config.ts`、`.env.example`，命中即失败。
- AI 密钥只放 Supabase Edge Function secrets：`supabase secrets set AI_API_KEY=...`。
- GitHub 仅操作本仓库，使用 deploy key / SSH agent；不读取、不输出任何私钥。

## 下一步

- **T2**：`profiles` / `medicine_boxes` / `box_members` 迁移 + RLS 辅助函数 + 建箱/加入/重置邀请码/转让/解散等 RPC
- 之后：药品 CRUD → 服药记录与库存 → 过期提醒 → 本地通知 → 任阳问答

## 待核实（落地前复核）

- Expo SDK 58 + RN 0.88 与 NativeWind 的兼容性（当前骨架用自建轻量 UI，未引入 NativeWind）
- pnpm 与 Expo 的兼容配置（当前用 npm）
- `expo-notifications` 的 Android 精确闹钟能力与上架政策（T8）
