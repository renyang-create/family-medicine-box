import { Platform } from 'react-native';

import { sortTimeLabels } from '@/shared/domain/time-of-day';

import { cancelReminder, scheduleDailyReminder } from './notifications';
import {
  deactivatePlan,
  fetchPlan,
  insertReminder,
  listPlanReminders,
  softDeleteReminders,
  upsertPlan,
} from './plan-api';

/**
 * 保存吃药计划并重建本地通知。
 *
 * 顺序很关键：
 * 1. 保存/更新计划模板
 * 2. 取消并软删旧提醒（避免同一时刻重复响）
 * 3. 逐条重新排本地通知，把 notification_id 写回数据库
 *
 * 网页版不支持本地通知：只保存计划，不排通知。
 */
export async function applyPlan(params: {
  boxId: string;
  medicineId: string;
  medicineName: string;
  unit: string | null;
  dosageAmount: number;
  times: string[];
}): Promise<void> {
  const times = sortTimeLabels(params.times);
  const existing = await fetchPlan(params.medicineId);

  if (times.length === 0) {
    if (existing) {
      const reminders = await listPlanReminders(existing.id);
      await Promise.all(reminders.map((item) => cancelReminder(item.notificationId)));
      await deactivatePlan(existing.id);
    }
    return;
  }

  const plan = await upsertPlan({
    existingId: existing?.id,
    boxId: params.boxId,
    medicineId: params.medicineId,
    dosageAmount: params.dosageAmount,
    times,
  });

  const oldReminders = await listPlanReminders(plan.id);
  await Promise.all(oldReminders.map((item) => cancelReminder(item.notificationId)));
  await softDeleteReminders(plan.id);

  if (Platform.OS === 'web') return;

  const dosageLabel = `${params.dosageAmount}${params.unit ?? ''}`;

  for (const timeLabel of times) {
    const notificationId = await scheduleDailyReminder({
      medicineName: params.medicineName,
      dosageLabel,
      boxId: params.boxId,
      medicineId: params.medicineId,
      timeLabel,
    });

    await insertReminder({
      boxId: params.boxId,
      planId: plan.id,
      medicineId: params.medicineId,
      timeLabel,
      notificationId,
    });
  }
}
