import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { PropsWithChildren } from 'react';

import { queryClient, queryPersister } from '@/lib/query-client';

/**
 * 只负责「服务端状态缓存 + 离线持久化」。
 * 不放业务逻辑，不放鉴权；鉴权在 AuthProvider。
 *
 * 说明：断网恢复后的 outbox 重放不由这里负责，见 OutboxBridge
 *      （队列非空时 15 秒轮询 + 回前台立即重试，不依赖网络状态库）。
 */
export function QueryProvider({ children }: PropsWithChildren) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
