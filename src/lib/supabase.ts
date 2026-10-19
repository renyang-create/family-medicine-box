import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from './env';

/**
 * Supabase 客户端单例。
 *
 * 说明：
 * - 会话存 AsyncStorage（官方 RN 姿势）。SecureStore 在 Android 有单值大小限制，
 *   Supabase session 可能超限，故 MVP 不用；如需加强在 P2 换成 SecureStore 分片适配器。
 * - RN 没有后台定时器，token 自动刷新必须由 App 前后台状态驱动。
 * - 权限不在这里做：所有隔离由数据库 RLS 保证（见 supabase/migrations）。
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
