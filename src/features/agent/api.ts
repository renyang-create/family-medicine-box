import { supabase } from '@/lib/supabase';
import { AGENT_QUOTA_EXCEEDED } from '@/shared/constants/agent';
import { AI_DAILY_QUOTA, AI_MAX_INPUT_CHARS } from '@/shared/constants/config';

import { findLocalAnswer, LOCAL_FALLBACK_ANSWER } from './local-answers';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type AgentQuota = {
  used: number;
  remaining: number;
};

/** 回答来源：model = 真模型；local = 本地常识库；quota = 额度用尽 */
export type AskResult = {
  answer: string;
  source: 'model' | 'local' | 'quota';
  remaining: number;
};

type MessageRow = {
  id: string;
  role: ChatRole;
  content: string;
  created_at: string;
};

function toMessage(row: MessageRow): ChatMessage {
  return { id: row.id, role: row.role, content: row.content, createdAt: row.created_at };
}

export async function fetchQuota(): Promise<AgentQuota> {
  const { data, error } = await supabase.rpc('ai_quota_status', { p_limit: AI_DAILY_QUOTA });
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as
    | { used?: number; remaining?: number }
    | null;

  return {
    used: Number(row?.used ?? 0),
    remaining: Number(row?.remaining ?? AI_DAILY_QUOTA),
  };
}

/** 取最近的会话；没有就建一个（会话是个人私有） */
export async function ensureConversation(): Promise<string> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id')
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  const existing = (data ?? [])[0] as { id?: string } | undefined;
  if (existing?.id) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from('ai_conversations')
    .insert({ title: '任阳对话' })
    .select('id')
    .single();

  if (insertError) throw insertError;
  return (created as { id: string }).id;
}

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) throw error;
  return ((data ?? []) as unknown as MessageRow[]).map(toMessage);
}

export async function insertMessage(
  conversationId: string,
  role: ChatRole,
  content: string,
): Promise<void> {
  const { error } = await supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    role,
    content: content.slice(0, 4000),
  });

  if (error) throw error;
}

/**
 * 提问。
 * 优先走 Edge Function（服务端扣额度 + 调模型）；
 * 函数未部署 / 没配 key / 网络失败 → 退回本地常识库，不消耗额度。
 */
export async function askAgent(question: string, history: ChatMessage[]): Promise<AskResult> {
  const trimmed = question.trim().slice(0, AI_MAX_INPUT_CHARS);

  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        question: trimmed,
        history: history.slice(-4).map((item) => ({ role: item.role, content: item.content })),
      },
    });

    if (error) throw error;

    const payload = data as
      | { ok?: boolean; answer?: string; code?: string; remaining?: number }
      | null;

    if (payload?.ok && payload.answer) {
      return {
        answer: payload.answer,
        source: 'model',
        remaining: Number(payload.remaining ?? 0),
      };
    }

    if (payload?.code === 'QUOTA_EXCEEDED') {
      return { answer: AGENT_QUOTA_EXCEEDED, source: 'quota', remaining: 0 };
    }

    throw new Error(payload?.code ?? 'AI_UNAVAILABLE');
  } catch {
    const local = findLocalAnswer(trimmed) ?? LOCAL_FALLBACK_ANSWER;
    return { answer: local, source: 'local', remaining: -1 };
  }
}
