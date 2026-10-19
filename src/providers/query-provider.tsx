import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { PropsWithChildren } from 'react';

import { queryClient, queryPersister } from '@/lib/query-client';

/**
 * 只负责「服务端状态缓存 + 离线持久化」。
 * 不放业务逻辑，不放鉴权；鉴权在 AuthProvider。
 *
 * TODO(T7)：接入网络状态监听（onlineManager + NetInfo/expo-network），
 *           恢复网络时触发 outbox 重放。
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
