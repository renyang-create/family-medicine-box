import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { ensureAndroidChannel, reconcileReminders } from '@/features/plans/notifications';
import { useAuth } from '@/providers/auth-provider';

/**
 * 通知桥：把 expo-notifications 和 App 连起来。
 * - 点通知 → 直达对应药品详情
 * - 登录后做一次对账（补齐/清理本地通知）
 * 网页版没有原生通知，整体跳过。
 */
export function NotificationBridge() {
  const router = useRouter();
  const { session } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void ensureAndroidChannel();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { kind?: string; boxId?: string; medicineId?: string }
        | undefined;

      if (data?.boxId && data?.medicineId) {
        router.push(`/box/${data.boxId}/medicine/${data.medicineId}`);
      }
    });

    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (!session || Platform.OS === 'web') return;
    // 先确保渠道（含旧渠道迁移）完成，再对账重排，否则可能读到刚被取消的通知
    void ensureAndroidChannel()
      .catch(() => undefined)
      .then(() => reconcileReminders())
      .catch(() => {
        // 对账失败不打断用户，下次启动会再试
      });
  }, [session]);

  return null;
}
