import { supabase } from '@/lib/supabase';
import { nextOccurrence, sortTimeLabels } from '@/shared/domain/time-of-day';

import type { MedicationPlan, PlanReminder, PlanRow, ReminderRow } from './types';

function toPlan(row: PlanRow): MedicationPlan {
  return {
    id: row.id,
    boxId: row.box_id,
    medicineId: row.medicine_id,
    dosageAmount: Number(row.dosage_amount),
    timesOfDay: row.times_of_day ?? [],
    isActive: row.is_active,
  };
}

/** 我这个用户在该药品上的启用中计划（RLS 已限制为本人） */
export async function fetchPlan(medicineId: string): Promise<MedicationPlan | null> {
  const { data, error } = await supabase
    .from('medication_plans')
    .select('id, box_id, medicine_id, dosage_amount, times_of_day, is_active')
    .eq('medicine_id', medicineId)
    .eq('is_deleted', false)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  const rows = (data ?? []) as unknown as PlanRow[];
  const first = rows[0];
  return first ? toPlan(first) : null;
}

export async function listPlanReminders(planId: string): Promise<PlanReminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('id, plan_id, time_label, notification_id, scheduled_at')
    .eq('plan_id', planId)
    .eq('is_deleted', false);

  if (error) throw error;

  return ((data ?? []) as unknown as ReminderRow[]).map((row) => ({
    id: row.id,
    planId: row.plan_id,
    timeLabel: row.time_label,
    notificationId: row.notification_id,
    scheduledAt: row.scheduled_at,
  }));
}

async function upsertPlan(params: {
  existingId?: string;
  boxId: string;
  medicineId: string;
  dosageAmount: number;
  times: string[];
}): Promise<MedicationPlan> {
  const times = sortTimeLabels(params.times);

  if (params.existingId) {
    const { data, error } = await supabase
      .from('medication_plans')
      .update({ dosage_amount: params.dosageAmount, times_of_day: times, is_active: true })
      .eq('id', params.existingId)
      .select('id, box_id, medicine_id, dosage_amount, times_of_day, is_active')
      .single();

    if (error) throw error;
    return toPlan(data as unknown as PlanRow);
  }

  const { data, error } = await supabase
    .from('medication_plans')
    .insert({
      box_id: params.boxId,
      medicine_id: params.medicineId,
      dosage_amount: params.dosageAmount,
      times_of_day: times,
      is_active: true,
    })
    .select('id, box_id, medicine_id, dosage_amount, times_of_day, is_active')
    .single();

  if (error) throw error;
  return toPlan(data as unknown as PlanRow);
}

/** 停用计划：软删计划 + 软删提醒（本地通知由调用方取消） */
export async function deactivatePlan(planId: string): Promise<void> {
  const { error: reminderError } = await supabase
    .from('reminders')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), status: 'cancelled' })
    .eq('plan_id', planId)
    .eq('is_deleted', false);

  if (reminderError) throw reminderError;

  const { error } = await supabase
    .from('medication_plans')
    .update({ is_active: false, is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', planId);

  if (error) throw error;
}

export async function insertReminder(params: {
  boxId: string;
  planId: string;
  medicineId: string;
  timeLabel: string;
  notificationId: string;
}): Promise<void> {
  const { error } = await supabase.from('reminders').insert({
    box_id: params.boxId,
    plan_id: params.planId,
    medicine_id: params.medicineId,
    time_label: params.timeLabel,
    notification_id: params.notificationId,
    scheduled_at: nextOccurrence(params.timeLabel).toISOString(),
    status: 'pending',
  });

  if (error) throw error;
}

export async function softDeleteReminders(planId: string): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), status: 'cancelled' })
    .eq('plan_id', planId)
    .eq('is_deleted', false);

  if (error) throw error;
}

export { upsertPlan };
