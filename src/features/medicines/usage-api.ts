import { supabase } from '@/lib/supabase';

export type UsageLog = {
  id: string;
  takenAt: string;
  dosageAmount: number;
  quantityDeducted: number;
  note: string | null;
  userId: string;
  userName: string | null;
};

export type RecordUsageResult = {
  logId: string;
  takenAt: string;
  quantityDeducted: number;
  quantityLeft: number;
};

type UsageLogRow = {
  id: string;
  taken_at: string;
  dosage_amount: number | string;
  quantity_deducted: number | string;
  note: string | null;
  user_id: string;
  profiles: { display_name: string } | null;
};

type RecordUsageRow = {
  log_id: string;
  taken_at: string;
  quantity_deducted: number | string;
  quantity_left: number | string;
};

/** 某个药品的服药历史（最近 limit 条） */
export async function fetchUsageLogs(medicineId: string, limit = 10): Promise<UsageLog[]> {
  const { data, error } = await supabase
    .from('medicine_usage_logs')
    .select('id, taken_at, dosage_amount, quantity_deducted, note, user_id, profiles ( display_name )')
    .eq('medicine_id', medicineId)
    .eq('is_deleted', false)
    .order('taken_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as unknown as UsageLogRow[]).map((row) => ({
    id: row.id,
    takenAt: row.taken_at,
    dosageAmount: Number(row.dosage_amount),
    quantityDeducted: Number(row.quantity_deducted),
    note: row.note,
    userId: row.user_id,
    userName: row.profiles?.display_name ?? null,
  }));
}

/**
 * 记录本次服药。
 * 扣库存、写日志、更新最近服药时间在数据库 RPC 里一次完成（原子）。
 * 库存为 0 时 quantityDeducted 返回 0，但日志照样写入。
 */
export async function recordUsage(
  medicineId: string,
  dosage: number,
  note?: string,
): Promise<RecordUsageResult> {
  const { data, error } = await supabase.rpc('record_medicine_usage', {
    p_medicine_id: medicineId,
    p_dosage: dosage,
    p_note: note ?? null,
  });

  if (error) throw error;

  const rows = (data ?? []) as unknown as RecordUsageRow[];
  const row = rows[0];
  if (!row) throw new Error('记录失败，请稍后重试');

  return {
    logId: row.log_id,
    takenAt: row.taken_at,
    quantityDeducted: Number(row.quantity_deducted),
    quantityLeft: Number(row.quantity_left),
  };
}

/** 撤销一条服药记录（本人或药箱创建者） */
export async function undoUsage(logId: string): Promise<void> {
  const { error } = await supabase.rpc('undo_usage_log', { p_log_id: logId });
  if (error) throw error;
}
