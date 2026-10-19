import type { ExpiryStatus } from '@/shared/domain/expiry';

/** 数据库行（snake_case） */
export type MedicineRow = {
  id: string;
  box_id: string;
  name: string;
  spec: string | null;
  quantity: number | string;
  unit: string | null;
  dosage: string | null;
  storage_location: string | null;
  batch_no: string | null;
  produced_on: string | null;
  expire_date: string | null;
  expiry_status: string;
  notes: string | null;
  last_taken_at: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

/** 界面用（camelCase） */
export type Medicine = {
  id: string;
  boxId: string;
  name: string;
  spec: string | null;
  quantity: number;
  unit: string | null;
  dosage: string | null;
  storageLocation: string | null;
  batchNo: string | null;
  producedOn: string | null;
  expireDate: string | null;
  expiryStatus: ExpiryStatus;
  notes: string | null;
  lastTakenAt: string | null;
};

export type MedicineInput = {
  name: string;
  spec?: string;
  quantity: number;
  unit?: string;
  dosage?: string;
  storageLocation?: string;
  batchNo?: string;
  producedOn?: string;
  expireDate?: string;
  notes?: string;
};
