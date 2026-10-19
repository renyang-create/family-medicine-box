import 'react-native-url-polyfill/auto';

import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/providers/auth-provider';
import { NotificationBridge } from '@/providers/notification-bridge';
import { OutboxBridge } from '@/providers/outbox-bridge';
import { QueryProvider } from '@/providers/query-provider';
import { colors } from '@/shared/ui';

void SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
    primary: colors.primary,
    border: colors.border,
    text: colors.text,
  },
};

/**
 * 分层原则：
 * - QueryProvider：服务端状态缓存（离线持久化）
 * - AuthProvider：会话订阅 + 登出清缓存
 * - 页面：只调 hooks，不直接碰 supabase 客户端
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider value={navigationTheme}>
              <NotificationBridge />
              <OutboxBridge />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
              <StatusBar style="dark" />
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
