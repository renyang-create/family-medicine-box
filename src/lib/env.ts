/**
 * 环境变量唯一入口。
 *
 * 硬约束：
 * - 客户端只能读 EXPO_PUBLIC_*（会被打进 bundle，必须可公开）。
 * - AI 密钥 / Supabase service role key 永远不进客户端，只存服务端 secrets。
 * - 缺失即抛错：宁可启动失败，也不要静默跑在错误配置上。
 *
 * 注意：Expo 只会内联「静态」的 process.env.EXPO_PUBLIC_XXX 访问，
 *       所以下面的读取必须逐字写全，不能用 process.env[name] 动态取值。
 */

// ---- 必需变量（逐个静态读取） ----
const RAW_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const RAW_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// ---- 高危变量：出现在客户端即为配置事故，启动时直接拦截 ----
const FORBIDDEN_PUBLIC_KEYS: readonly (readonly [string, string | undefined])[] = [
  ['EXPO_PUBLIC_AI_API_KEY', process.env.EXPO_PUBLIC_AI_API_KEY],
  ['EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY', process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY],
  ['EXPO_PUBLIC_DEEPSEEK_API_KEY', process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY],
  ['EXPO_PUBLIC_OPENAI_API_KEY', process.env.EXPO_PUBLIC_OPENAI_API_KEY],
];

function requireValue(name: string, value: string | undefined): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`[env] 缺少环境变量 ${name}：请复制 .env.example 为 .env.local 并填写`);
  }
  return value.trim();
}

function assertNoForbiddenPublicKeys(): void {
  for (const [name, value] of FORBIDDEN_PUBLIC_KEYS) {
    if (value) {
      throw new Error(`[env] 检测到高危变量 ${name}：密钥只允许存在于服务端，请立即移除`);
    }
  }
}

assertNoForbiddenPublicKeys();

export const env = {
  supabaseUrl: requireValue('EXPO_PUBLIC_SUPABASE_URL', RAW_SUPABASE_URL),
  supabaseAnonKey: requireValue('EXPO_PUBLIC_SUPABASE_ANON_KEY', RAW_SUPABASE_ANON_KEY),
} as const;
