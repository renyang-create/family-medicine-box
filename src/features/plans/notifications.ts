import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { nextOccurrence } from '@/shared/domain/time-of-day';
import { supabase } from '@/lib/supabase';

import type { ReminderRow } from './types';

export const MEDICATION_CHANNEL_ID = 'medication-reminders';

/**
 * 前台收到通知时的展示行为。
 * 网页版没有原生通知，直接跳过，避免 web 上调用失败。
 */
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Android 必须先建渠道，否则通知不会弹出 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(MEDICATION_CHANNEL_ID, {
    name: '吃药提醒',
    // eslint-disable-next-line import/namespace -- TS 能解析，eslint 的 namespace 解析器不支持 .d.ts 的 export *
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });
}

type ScheduleParams = {
  medicineName: string;
  dosageLabel: string;
  boxId: string;
  medicineId: string;
  timeLabel: string;
};

/** 用「每天固定时刻」的重复触发器，不依赖网络，App 没打开也会响 */
export async function scheduleDailyReminder(params: ScheduleParams): Promise<string> {
  const [hour, minute] = params.timeLabel.split(':').map(Number);

  return Notifications.scheduleNotificationAsync({
    content: {
      title: '该吃药了',
      body: `${params.medicineName}${params.dosageLabel ? ` · ${params.dosageLabel}` : ''}`,
      data: {
        kind: 'medication',
        boxId: params.boxId,
        medicineId: params.medicineId,
        timeLabel: params.timeLabel,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hour ?? 8,
      minute: minute ?? 0,
      channelId: MEDICATION_CHANNEL_ID,
    },
  });
}

export async function cancelReminder(notificationId: string | null): Promise<void> {
  if (!notificationId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // 通知可能已经被系统清掉，忽略即可
  }
}

/** 展示用：下一次触发时间 */
export function describeNextOccurrence(timeLabel: string): string {
  const next = nextOccurrence(timeLabel);
  const isToday = next.toDateString() === new Date().toDateString();
  return `${isToday ? '今天' : '明天'} ${timeLabel}`;
}

type PendingReminderRow = ReminderRow & {
  box_id: string;
  medicine_id: string;
  medicines: { name: string; unit: string | null } | null;
};

/**
 * 通知对账（App 启动 / 回到前台时跑）：
 * 1. 系统里有、数据库里没有的「吃药通知」→ 取消（孤儿）
 * 2. 数据库里有、系统里没有的 → 重新排（设备重启/重装/系统清理后的自愈）
 */
export async function reconcileReminders(): Promise<void> {
  if (Platform.OS === 'web') return;

  const { data, error } = await supabase
    .from('reminders')
    .select(
      'id, plan_id, box_id, medicine_id, time_label, notification_id, scheduled_at, medicines ( name, unit )',
    )
    .eq('is_deleted', false)
    .eq('status', 'pending');

  if (error) return;

  const rows = (data ?? []) as unknown as PendingReminderRow[];
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const scheduledIds = new Set(scheduled.map((item) => item.identifier));
  const dbNotificationIds = new Set(
    rows.map((row) => row.notification_id).filter((id): id is string => Boolean(id)),
  );

  for (const item of scheduled) {
    const kind = (item.content.data as { kind?: string } | null)?.kind;
    if (kind === 'medication' && !dbNotificationIds.has(item.identifier)) {
      await cancelReminder(item.identifier);
    }
  }

  for (const row of rows) {
    if (row.notification_id && scheduledIds.has(row.notification_id)) continue;
    if (!row.medicines) continue;

    const plan = await supabase
      .from('medication_plans')
      .select('dosage_amount')
      .eq('id', row.plan_id)
      .maybeSingle();

    const dosage = Number(plan.data?.dosage_amount ?? 1);
    const unit = row.medicines.unit ?? '';

    try {
      const newId = await scheduleDailyReminder({
        medicineName: row.medicines.name,
        dosageLabel: `${dosage}${unit}`,
        boxId: row.box_id,
        medicineId: row.medicine_id,
        timeLabel: row.time_label,
      });
      await supabase.from('reminders').update({ notification_id: newId }).eq('id', row.id);
    } catch {
      // 单个失败不影响其它提醒
    }
  }
}
