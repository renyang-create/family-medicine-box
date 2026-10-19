import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

/**
 * 服务端状态缓存。
 *
 * 离线策略（P0 简化版）：
 * - 查询结果持久化到 AsyncStorage，冷启动/断网可读。
 * - 写操作在 T7 通过 outbox 队列重放（本文件先预留结构，不实现队列）。
 * - 冲突策略：客户端最新修改优先（多人同时编辑存在覆盖风险，P2 优化）。
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 0,
    },
  },
});

/**
 * 缓存 key 带版本号：药品结构变化（如新增 tags）时 +1，
 * 让旧版本留下的缓存直接失效，避免读到缺字段的旧对象。
 */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'fmb.query.cache.v3',
  throttleTime: 1_000,
});
