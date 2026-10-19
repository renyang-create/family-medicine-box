import { supabase } from '@/lib/supabase';

/** 跨药箱的药品概览：用于首页过期徽标、提醒列表、全局搜索 */
export type MedicineOverview = {
  id: string;
  boxId: string;
  boxName: string;
  name: string;
  expireDate: string | null;
};

type OverviewRow = {
  id: string;
  box_id: string;
  name: string;
  expire_date: string | null;
  medicine_boxes: { name: string } | null;
};

/**
 * 一次取回「我能看到的全部药品」。
 * 安全性不靠前端过滤：medicines / medicine_boxes 的 RLS 只返回我加入的药箱。
 */
export async function fetchMedicineOverview(): Promise<MedicineOverview[]> {
  const { data, error } = await supabase
    .from('medicines')
    .select('id, box_id, name, expire_date, medicine_boxes ( name )')
    .eq('is_deleted', false)
    .order('name', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as OverviewRow[]).map((row) => ({
    id: row.id,
    boxId: row.box_id,
    boxName: row.medicine_boxes?.name ?? '未命名药箱',
    name: row.name,
    expireDate: row.expire_date,
  }));
}
