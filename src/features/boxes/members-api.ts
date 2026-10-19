import { supabase } from '@/lib/supabase';
import type { BoxRole } from '@/types/database';

export type BoxMemberView = {
  userId: string;
  role: BoxRole;
  joinedAt: string;
  displayName: string | null;
};

type MemberRow = {
  user_id: string;
  role: BoxRole;
  joined_at: string;
  profiles: { display_name: string } | null;
};

export async function fetchBoxMembers(boxId: string): Promise<BoxMemberView[]> {
  const { data, error } = await supabase
    .from('box_members')
    .select('user_id, role, joined_at, profiles ( display_name )')
    .eq('box_id', boxId)
    .eq('is_deleted', false)
    .order('joined_at', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as MemberRow[]).map((row) => ({
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    displayName: row.profiles?.display_name ?? null,
  }));
}

/** 重置邀请码：旧码立刻失效（仅创建者） */
export async function resetInviteCode(boxId: string): Promise<string> {
  const { data, error } = await supabase.rpc('reset_invite_code', { p_box_id: boxId });
  if (error) throw error;
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('重置邀请码失败，请稍后重试');
  }
  return data;
}

export async function removeBoxMember(boxId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_box_member', {
    p_box_id: boxId,
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function transferBoxCreator(boxId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('transfer_box_creator', {
    p_box_id: boxId,
    p_to_user_id: userId,
  });
  if (error) throw error;
}

export async function leaveBox(boxId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_box', { p_box_id: boxId });
  if (error) throw error;
}

export async function dissolveBox(boxId: string): Promise<void> {
  const { error } = await supabase.rpc('dissolve_box', { p_box_id: boxId });
  if (error) throw error;
}
