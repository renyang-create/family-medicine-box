import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/providers/auth-provider';

/** 未登录区域：已登录用户访问时直接回首页 */
export default function AuthLayout() {
  const { session, isBootstrapped } = useAuth();

  if (!isBootstrapped) return null;
  if (session) return <Redirect href="/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
