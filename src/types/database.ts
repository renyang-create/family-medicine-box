/**
 * 数据库行类型（手写的最小集）。
 * 等 Supabase CLI 可用后，用 `npm run db:types` 生成完整类型替换本文件。
 */

export type BoxRole = 'creator' | 'member';

export type MedicineBoxRow = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  invite_code_updated_at: string;
  member_count: number;
  created_by: string;
  creator_transferred_at: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type BoxMemberRow = {
  id: string;
  box_id: string;
  user_id: string;
  role: BoxRole;
  joined_at: string;
  is_deleted: boolean;
};

export type ProfileRow = {
  id: string;
  display_name: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};
