import { supabase } from '@/lib/supabase';
import type { ExpiryStatus } from '@/shared/domain/expiry';

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
