import { useEffect } from 'react';
import { AppState } from 'react-native';

import { flushOutbox, hydrateOutbox } from '@/features/sync/outbox';
import { useOutboxOps } from '@/features/sync/use-outbox';
import { useAuth } from '@/providers/auth-provider';

/** 队列非空时的重试间隔：够快（联网后 15 秒内补上），又不至于疯狂打服务端 */
const RETRY_INTERVAL_MS = 15_000;

/**
 * 离线队列的执行器（无 UI）。
 *
 * 没有引入网络状态库（NetInfo / expo-network），原因：
 * 少一个原生依赖，且「有队列就定时试一次」本身就能覆盖
 * 断网 → 联网、切后台 → 回前台、Wi-Fi 切换这些场景。
 * 失败不打扰用户，队列留在本地，下次继续。
 */
export function OutboxBridge() {
  const { session } = useAuth();
  const ops = useOutboxOps();
  const pending = ops.length;

  useEffect(() => {
    void hydrateOutbox();
  }, []);

  useEffect(() => {
    if (!session || pending === 0) return;

    let active = true;
    const run = () => {
      if (!active) return;
      void flushOutbox().catch(() => {
        // 还是不通：保持队列，等下一轮
      });
    };

    run();
    const timer = setInterval(run, RETRY_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });

    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [session, pending]);

  return null;
}
