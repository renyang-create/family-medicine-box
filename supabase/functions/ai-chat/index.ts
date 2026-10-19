// ============================================================
// 家庭药箱 · 任阳问答代理（Supabase Edge Function）
//
// 职责：
//   1. 校验登录用户（用调用方的 JWT，不用 service role）
//   2. 服务端原子扣减每日额度
//   3. 调 AI 供应商（OpenAI 兼容协议），密钥只从环境变量读
//   4. 上游失败时退回额度，并只返回稳定错误码（不泄漏上游细节）
//
// 部署前需要配置的 secrets（不要在代码里写死）：
//   supabase secrets set AI_API_KEY=xxx AI_BASE_URL=https://open.bigmodel.cn/api/paas/v4 AI_MODEL=glm-4-flash
//
// 部署：
//   npx supabase functions deploy ai-chat
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DAILY_LIMIT = 20;
const MAX_QUESTION_CHARS = 300;
/**
 * 输出上限。
 * GLM-5 系列是「先思考再回答」的模型，思考过程也会占 token；
 * 给小了会出现 finish_reason=length、content 为空的情况（日志里就是这个），
 * 所以第一次给 1500，被截断时再翻倍重试一次。
 */
const MAX_OUTPUT_TOKENS = 1500;
const UPSTREAM_TIMEOUT_MS = 20000;

/**
 * 系统提示词只存在服务端。
 * 注意：不要求模型输出免责声明 —— 免责是前端固定静态文案。
 */
const SYSTEM_PROMPT = [
  '你是家庭药箱 App 里的 AI 助手，名字叫「任阳」。',
  '你只提供一般性的用药常识参考，不做诊断，不开处方。',
  '规则：',
  '1. 不给出处方药的具体剂量方案，只提示按说明书或医嘱。',
  '2. 涉及急症、儿童、孕妇、哺乳、慢病用药冲突时，明确建议尽快就医或咨询药师。',
  '3. 不确定就直说不知道，不要编造药品名称、批号或研究结论。',
  '4. 回答用简体中文，简短分点，控制在 200 字以内。',
  '5. 不要输出任何免责声明文本（前端会统一展示）。',
].join('\n');

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

type HistoryItem = { role?: string; content?: string };

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ ok: false, code: 'UNAUTHENTICATED' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return json({ ok: false, code: 'UNAUTHENTICATED' }, 401);
    }

    const payload = (await req.json().catch(() => ({}))) as {
      question?: string;
      history?: HistoryItem[];
    };

    const question = String(payload.question ?? '')
      .trim()
      .slice(0, MAX_QUESTION_CHARS);

    if (!question) {
      return json({ ok: false, code: 'EMPTY_QUESTION' }, 400);
    }

    const apiKey = Deno.env.get('AI_API_KEY');
    if (!apiKey) {
      // 没配 key 时不扣额度，直接让前端走本地常识库
      console.error('[ai-chat] AI_API_KEY 未配置');
      return json({ ok: false, code: 'AI_NOT_CONFIGURED' });
    }

    // 先扣额度：原子操作，并发下也不会超发
    const { data: quotaRows, error: quotaError } = await supabase.rpc('consume_ai_quota', {
      p_limit: DAILY_LIMIT,
    });

    if (quotaError) {
      // 常见原因：T9 迁移没跑（consume_ai_quota 不存在）
      console.error('[ai-chat] 扣额度失败', quotaError.message);
      return json({ ok: false, code: 'QUOTA_ERROR' });
    }

    const quota = (Array.isArray(quotaRows) ? quotaRows[0] : quotaRows) as
      | { allowed?: boolean; remaining?: number }
      | null;

    if (!quota?.allowed) {
      return json({ ok: false, code: 'QUOTA_EXCEEDED', remaining: 0 });
    }

    const baseUrl = (Deno.env.get('AI_BASE_URL') ?? 'https://open.bigmodel.cn/api/paas/v4').replace(
      /\/$/,
      '',
    );
    const model = Deno.env.get('AI_MODEL') ?? 'glm-4-flash';

    const history = Array.isArray(payload.history) ? payload.history.slice(-4) : [];
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((item) => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: String(item.content ?? '').slice(0, 500),
      })),
      { role: 'user', content: question },
    ];

    let answer = '';

    // 两轮：第二轮只在「被长度截断」时用，给思考型模型留够空间
    for (const maxTokens of [MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS * 2]) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

      let upstream: Response;
      try {
        upstream = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.3,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });
      } catch (error) {
        clearTimeout(timer);
        await supabase.rpc('refund_ai_quota');
        console.error(
          `[ai-chat] 请求上游失败 model=${model} max_tokens=${maxTokens} err=${error instanceof Error ? error.message : String(error)}`,
        );
        return json({ ok: false, code: 'NETWORK_TIMEOUT' });
      }

      clearTimeout(timer);

      if (!upstream.ok) {
        await supabase.rpc('refund_ai_quota');
        // 只写服务端日志（不含 key），方便在 Dashboard → Edge Functions → Logs 里定位
        const detail = await upstream.text().catch(() => '');
        console.error(
          `[ai-chat] 上游失败 status=${upstream.status} model=${model} url=${baseUrl}/chat/completions body=${detail.slice(0, 300)}`,
        );
        return json({ ok: false, code: 'UPSTREAM_ERROR', status: upstream.status });
      }

      const data = await upstream.json();
      const choice = data?.choices?.[0];
      const finishReason = String(choice?.finish_reason ?? '');
      answer = String(choice?.message?.content ?? '').trim();

      if (answer) break;

      console.error(
        `[ai-chat] 上游返回空内容 model=${model} max_tokens=${maxTokens} finish=${finishReason} has_reasoning=${Boolean(choice?.message?.reasoning_content)} body=${JSON.stringify(data).slice(0, 300)}`,
      );

      // 只有「被长度截断」值得再试一次；其它空内容直接放弃
      if (finishReason !== 'length') break;
    }

    if (!answer) {
      await supabase.rpc('refund_ai_quota');
      return json({ ok: false, code: 'EMPTY_ANSWER' });
    }

    return json({
      ok: true,
      answer: answer.slice(0, 1200),
      model,
      remaining: Number(quota.remaining ?? 0),
    });
  } catch (error) {
    // 细节只写服务端日志，返回给客户端的仍是稳定错误码
    console.error('[ai-chat] 内部异常', error instanceof Error ? error.message : String(error));
    return json({ ok: false, code: 'INTERNAL_ERROR' }, 500);
  }
});
