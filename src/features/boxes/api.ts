import { supabase } from '@/lib/supabase';
import type { BoxRole, MedicineBoxRow } from '@/types/database';

/** 首页卡片需要的最小信息 */
export type MyBox = {
  boxId: string;
  name: string;
  role: BoxRole;
  memberCount: number;
  /** 只有创建者能看到邀请码；普通成员为 null */
  inviteCode: string | null;
  joinedAt: string;
};

type MemberEmbedRow = {
  role: BoxRole;
  joined_at: string;
  box_id: string;
  medicine_boxes: Pick<MedicineBoxRow, 'id' | 'name' | 'member_count' | 'invite_code'> | null;
};

/**
 * 我加入的药箱列表。
 * 安全性不靠前端过滤：box_members / medicine_boxes 的 RLS 只返回我可见的行。
 */
export async function fetchMyBoxes(): Promise<MyBox[]> {
  const { data, error } = await supabase
    .from('box_members')
    .select('role, joined_at, box_id, medicine_boxes ( id, name, member_count, invite_code )')
    .eq('is_deleted', false)
    .order('joined_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as MemberEmbedRow[];

  return rows
    .filter((row) => row.medicine_boxes !== null)
    .map((row) => ({
      boxId: row.box_id,
      name: row.medicine_boxes?.name ?? '未命名药箱',
      role: row.role,
      memberCount: row.medicine_boxes?.member_count ?? 1,
      inviteCode: row.role === 'creator' ? (row.medicine_boxes?.invite_code ?? null) : null,
      joinedAt: row.joined_at,
    }));
}

/** 创建药箱：RPC 内部会校验登录态并自动把调用者写成 creator */
export async function createBox(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_box', { p_name: name.trim() });
  if (error) throw error;
  const box = data as unknown as MedicineBoxRow | null;
  if (!box?.id) throw new Error('创建药箱失败，请稍后重试');
  return box.id;
}

/** 用邀请码加入：服务端会去空格 + 转大写 + 校验 5 人上限 */
export async function joinBox(code: string): Promise<{ boxId: string; boxName: string }> {
  const { data, error } = await supabase.rpc('join_box_by_invite_code', { p_code: code });
  if (error) throw error;
  const rows = (data ?? []) as unknown as { box_id: string; box_name: string }[];
  const first = rows[0];
  if (!first) throw new Error('加入失败，请稍后重试');
  return { boxId: first.box_id, boxName: first.box_name };
}
