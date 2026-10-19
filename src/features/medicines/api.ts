import { supabase } from '@/lib/supabase';
import type { ExpiryStatus } from '@/shared/domain/expiry';
import { sanitizeTags } from '@/shared/domain/tags';

import type { Medicine, MedicineInput, MedicineRow } from './types';

function toNullable(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function toMedicine(row: MedicineRow): Medicine {
  return {
    id: row.id,
    boxId: row.box_id,
    name: row.name,
    spec: row.spec,
    quantity: Number(row.quantity),
    unit: row.unit,
    dosage: row.dosage,
    storageLocation: row.storage_location,
    batchNo: row.batch_no,
    producedOn: row.produced_on,
    expireDate: row.expire_date,
    expiryStatus: row.expiry_status as ExpiryStatus,
    notes: row.notes,
    lastTakenAt: row.last_taken_at,
    tags: sanitizeTags(row.tags),
  };
}

function toRowPayload(input: MedicineInput) {
  return {
    name: input.name.trim(),
    spec: toNullable(input.spec),
    quantity: input.quantity,
    unit: toNullable(input.unit),
    dosage: toNullable(input.dosage),
    storage_location: toNullable(input.storageLocation),
    batch_no: toNullable(input.batchNo),
    produced_on: toNullable(input.producedOn),
    expire_date: toNullable(input.expireDate),
    notes: toNullable(input.notes),
    tags: sanitizeTags(input.tags),
  };
}

/**
 * 界面对象 → 写库入参。
 * 用于「批量改某个字段」（比如标签改名）：拿现有药品补全表单，只改一个字段再写回。
 */
export function medicineToInput(medicine: Medicine, tags: string[] = medicine.tags): MedicineInput {
  return {
    name: medicine.name,
    spec: medicine.spec ?? '',
    quantity: medicine.quantity,
    unit: medicine.unit ?? '',
    dosage: medicine.dosage ?? '',
    storageLocation: medicine.storageLocation ?? '',
    batchNo: medicine.batchNo ?? '',
    producedOn: medicine.producedOn ?? '',
    expireDate: medicine.expireDate ?? '',
    notes: medicine.notes ?? '',
    tags,
  };
}

/** 某个药箱的药品列表（RLS 保证不会跨箱） */
export async function fetchMedicines(boxId: string): Promise<Medicine[]> {
  const { data, error } = await supabase
    .from('medicines')
    .select('*')
    .eq('box_id', boxId)
    .eq('is_deleted', false);

  if (error) throw error;
  return ((data ?? []) as unknown as MedicineRow[]).map(toMedicine);
}

export async function fetchMedicine(id: string): Promise<Medicine> {
  const { data, error } = await supabase
    .from('medicines')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('药品不存在或已被删除');
  return toMedicine(data as unknown as MedicineRow);
}

export async function createMedicine(boxId: string, input: MedicineInput): Promise<Medicine> {
  const { data, error } = await supabase
    .from('medicines')
    .insert({ ...toRowPayload(input), box_id: boxId })
    .select('*')
    .single();

  if (error) throw error;
  return toMedicine(data as unknown as MedicineRow);
}

export async function updateMedicine(id: string, input: MedicineInput): Promise<Medicine> {
  const { data, error } = await supabase
    .from('medicines')
    .update(toRowPayload(input))
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return toMedicine(data as unknown as MedicineRow);
}

/** 软删除：只把 is_deleted 置真，不物理删行 */
export async function softDeleteMedicine(id: string): Promise<void> {
  const { error } = await supabase
    .from('medicines')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
