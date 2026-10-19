import { Redirect } from 'expo-router';

import { useAuth } from '@/providers/auth-provider';

/** 启动分流：已登录进药箱，未登录去登录页。会话恢复完成前保持启动图。 */
export default function Index() {
  const { session, isBootstrapped } = useAuth();

  if (!isBootstrapped) return null;

  return <Redirect href={session ? '/(tabs)' : '/sign-in'} />;
}
