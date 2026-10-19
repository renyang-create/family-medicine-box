import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/**
 * 认证只走 Supabase Auth。
 * 注意：display_name 写进 user metadata，注册触发器会据此创建 profiles 行。
 */

export async function signInWithPassword(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error('登录没有返回会话，请稍后重试');
  return data.session;
}

/**
 * 注册。若项目开启了「邮箱确认」，这里不会返回 session，
 * 需要用户去邮箱点链接后再登录 —— 返回 null 表示这种情况。
 */
export async function signUpWithPassword(
  email: string,
  password: string,
  displayName: string,
): Promise<Session | null> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw error;
  return data.session ?? null;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
