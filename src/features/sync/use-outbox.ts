import { useSyncExternalStore } from 'react';

import { getOutboxSnapshot, subscribeOutbox, type OutboxOp } from './outbox';

/**
 * 订阅本地写队列。
 * 用 useSyncExternalStore 而不是 React Query：队列是本地状态，
 * 不需要网络请求，也不该参与「过期时间 / 重取」那一套。
 */
export function useOutboxOps(): OutboxOp[] {
  return useSyncExternalStore(subscribeOutbox, getOutboxSnapshot, getOutboxSnapshot);
}

/** 某个药箱还有多少条待同步（列表页横幅用） */
export function usePendingCount(boxId: string): number {
  const ops = useOutboxOps();
  return ops.filter((op) => op.boxId === boxId).length;
}
