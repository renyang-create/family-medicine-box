# 家庭药箱 · family-medicine-box

和家人共享一个药箱：药品、有效期、服药记录、吃药提醒，以及一个接了大模型的 AI 助手「任阳」。

安卓内测版下载（APK，需在系统浏览器里打开）：
**https://renyang-create.github.io/medicine-box-apk/**

> 内测分发包，未上架应用商店；目前只提供 Android 包，iOS 需自行用 EAS 构建。

## 功能

- **家庭共享药箱**：邀请码加入，每箱最多 5 人；创建者可转让、解散，成员可退出
- **药品管理**：名称、规格、数量、用法、存放位置、批次、生产日期、有效期、备注
- **有效期预警**：临期 30 天标黄、过期标红并置顶；排序为「已过期 → 最近服药 → 无记录」
- **服药记录**：记录一次服药自动扣库存（库存为 0 只写记录），支持撤销回补
- **症状标签**：预设 12 个症状词 + 自定义，最多 6 个/药品；支持多标签筛选、批量改名/删除、全局搜索按标签命中
- **吃药提醒**：`expo-notifications` 本地调度（不依赖网络），每日固定时刻重复；App 启动时对账自愈
- **离线可用**：查询结果持久化到本地；断网时新增/修改/删除进入本地 outbox 队列，联网后按序重放
- **AI 助手「任阳」**：经 Supabase Edge Function 代理调用 OpenAI 兼容接口；服务端扣额度、失败退回；未配置或失败时降级到本地常识库

## 技术栈

| 层 | 选型 |
|---|---|
| App | React Native 0.88 + Expo SDK 58 + TypeScript（strict） |
| 路由 | Expo Router（`src/app`，文件路由） |
| 服务端状态 | TanStack Query + AsyncStorage 持久化 |
| 本地写队列 | 自建 outbox（AsyncStorage + 临时 id → 服务端 id 映射） |
| 后端 | Supabase（Postgres + Auth + RLS + Edge Functions + pg_cron） |
| 本地通知 | expo-notifications（精确闹钟权限 + 最高优先级渠道） |
| AI | Supabase Edge Function 代理，密钥只存服务端 secrets |
| 质量 | vitest 单测 + typecheck + eslint + 密钥扫描（`npm run verify`） |
| 分发 | EAS Build（`preview` → APK） |

## 目录结构

```
src/
├─ app/                  # 路由（Expo Router）
│  ├─ _layout.tsx        # Provider：Query → Auth → Theme → 通知桥 / outbox 桥
│  ├─ (auth)/            # 登录、资料完善
│  ├─ (tabs)/            # 药箱 / 任阳 / 设置
│  ├─ box/[boxId]/       # 药箱详情、成员、标签管理、药品新增/编辑/详情/提醒
│  ├─ search.tsx         # 全局搜索（名称 + 症状标签）
│  └─ reminders.tsx      # 临期/过期列表
├─ features/
│  ├─ medicines/         # 药品 CRUD、表单、标签服务、服药记录
│  ├─ boxes/             # 药箱与成员
│  ├─ plans/             # 吃药计划与本地通知
│  ├─ agent/             # 任阳：问答、额度、本地常识库
│  └─ sync/              # 离线 outbox：队列、重放、乐观合并
├─ lib/                  # supabase 客户端、query-client、env 校验
├─ providers/            # Query / Auth / 通知桥 / outbox 桥
└─ shared/               # 常量、纯领域逻辑（带单测）、UI 组件、工具
supabase/migrations/     # 按 T2→T10 顺序执行的建表与 RLS
supabase/functions/      # ai-chat：问答代理
scripts/check-secrets.mjs
```

## 快速开始

环境要求：Node **≥ 22.13**，npm。

```bash
npm install
cp .env.example .env.local   # 填入自己的 Supabase URL 与 anon key
npm start
```

数据库：按文件名字典序在 Supabase SQL Editor 里依次执行 `supabase/migrations/*.sql`（`t2` → `t10`）。

`.env.local` 只允许 `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`；**service role key 与任何 AI 密钥都不得出现在客户端**。

### 接入 AI（可选）

```bash
npx supabase login
npx supabase link --project-ref <你的项目 ref>
npx supabase secrets set \
  AI_API_KEY=<你的 key> \
  AI_BASE_URL=https://open.bigmodel.cn/api/paas/v4 \
  AI_MODEL=glm-4-flash
npx supabase functions deploy ai-chat
```

`AI_BASE_URL` 只写到 `/v4`（或 `/v1`），代码里会自动拼 `/chat/completions`。
没配 key 时，App 会自动降级成本地常识库回答，不会报错。

## 验证（提交前必须全绿）

```bash
npm run verify   # = typecheck + lint + test + check:secrets
```

## 关键约定（改代码前先读）

1. **文案不外泄到页面**：任阳相关文案只在 `src/shared/constants/agent.ts`。
2. **免责声明是静态常量**：不得由 AI 生成，每条 AI 回复下方固定渲染。
3. **日期口径**：时间戳存 `timestamptz`（UTC），展示按设备本地时区；有效期 `expire_date` 是日历日期，不做时区换算。
4. **临期/过期**：`expire_date - 今天(本地) ∈ [0, 30]` 为临期，`< 0` 为过期。
5. **权限只在数据库做**：所有表 RLS 用 `auth.uid()`；前端传的 `user_id` 不作为身份依据。
6. **软删除**：业务表只有 `is_deleted`，没有物理删除。
7. **写操作走 feature 层**：页面不直接调用 supabase 客户端做业务写。
8. **通知边界**：提醒只由 expo-notifications 本地调度；pg_cron 仅刷新临期/过期状态。

## 安全约定

- `.gitignore` 屏蔽 `.env*`（保留 `.env.example`）、keystore、`credentials.json`、`google-services.json`、`supabase/.temp/`
- `npm run check:secrets` 扫描源码与配置，命中密钥即失败
- AI 密钥只放 Supabase Edge Function secrets，客户端只持有 anon key（安全性由 RLS 保证）
- 所有写接口先校验登录态，再校验药箱成员身份

## 打 APK（EAS Build）

```bash
npx eas-cli build --platform android --profile preview
```

构建环境必须能读到 `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`：`.env.local` 被 git 忽略、不会上传，需要在 EAS 配环境变量（`eas.json` 的 profile 已声明 `"environment": "preview"`）。漏配的表现是 APK 装上后点开立刻闪退（`src/lib/env.ts` 启动即校验）。

## 免责声明

本应用只提供用药记录与一般性用药常识参考，**不提供诊断、不开处方**。涉及急症、儿童、孕妇、哺乳期、慢病用药冲突等情况，请及时就医或咨询药师。AI 回复为模型生成内容，可能出错，请以药品说明书和医嘱为准。

## License

[MIT](./LICENSE)
