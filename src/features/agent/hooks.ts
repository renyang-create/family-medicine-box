import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  askAgent,
  ensureConversation,
  fetchMessages,
  fetchQuota,
  insertMessage,
  type AskResult,
  type ChatMessage,
} from './api';

export const agentKeys = {
  all: ['agent'] as const,
  conversation: () => [...agentKeys.all, 'conversation'] as const,
  messages: (conversationId: string) => [...agentKeys.all, 'messages', conversationId] as const,
  quota: () => [...agentKeys.all, 'quota'] as const,
};

export function useAgentConversation() {
  return useQuery({
    queryKey: agentKeys.conversation(),
    queryFn: ensureConversation,
    staleTime: Infinity,
  });
}

export function useAgentMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: agentKeys.messages(conversationId ?? 'none'),
    queryFn: () => fetchMessages(conversationId as string),
    enabled: Boolean(conversationId),
  });
}

export function useAgentQuota() {
  return useQuery({
    queryKey: agentKeys.quota(),
    queryFn: fetchQuota,
    staleTime: 10_000,
  });
}

export function useSendMessage(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (question: string): Promise<AskResult> => {
      if (!conversationId) throw new Error('会话还没准备好，请稍后再试');

      const history =
        queryClient.getQueryData<ChatMessage[]>(agentKeys.messages(conversationId)) ?? [];

      await insertMessage(conversationId, 'user', question);
      const result = await askAgent(question, history);
      await insertMessage(conversationId, 'assistant', result.answer);

      return result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}
