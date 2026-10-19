import type { Session } from '@supabase/supabase-js';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { clearOutbox } from '@/features/sync/outbox';
import { supabase } from '@/lib/supabase';

type AuthState = {
  /** 当前登录会话；未登录为 null */
  session: Session | null;
  /** 是否已完成首次会话恢复（false 时不要做路由判断） */
  isBootstrapped: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * 只负责「会话订阅」。
 * 收到 SIGNED_OUT 时清空 query 缓存，避免上一个账号的数据残留给下一个账号。
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ session: null, isBootstrapped: false });

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setState({ session: data.session, isBootstrapped: true });
      void SplashScreen.hideAsync();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ session, isBootstrapped: true });
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        // 离线队列不跨账号：否则会把上一个账号的修改重放到下一个账号
        void clearOutbox();
      }
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo(() => state, [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('[auth] useAuth 必须在 AuthProvider 内使用');
  }
  return ctx;
}
