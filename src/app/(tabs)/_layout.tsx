import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useAuth } from '@/providers/auth-provider';
import { AGENT_NAME } from '@/shared/constants/agent';
import { colors } from '@/shared/ui';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * tabBarIcon 传入的 color 类型包含 null / OpaqueColorValue，
 * 而 Ionicons 只接受 string | NativeColorValue，这里统一收口。
 */
function TabIcon({ color, name, size }: { color: ColorValue | null; name: IconName; size: number }) {
  return <Ionicons color={typeof color === 'string' ? color : undefined} name={name} size={size} />;
}

/** 已登录区域：药箱 / 任阳 / 设置 */
export default function TabsLayout() {
  const { session, isBootstrapped } = useAuth();

  if (!isBootstrapped) return null;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: { borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '药箱',
          tabBarIcon: ({ color, size }) => <TabIcon color={color} name="medkit-outline" size={size} />,
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          title: AGENT_NAME,
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="chatbubble-ellipses-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="settings-outline" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
