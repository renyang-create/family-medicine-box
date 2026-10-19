import { hasTag, normalizeTag, sanitizeTags } from '@/shared/domain/tags';
import { isNetworkError } from '@/shared/utils/network';

import { enqueueUpdate } from '@/features/sync/outbox';
import { isLocalMedicineId } from '@/features/sync/local-id';

import { medicineToInput, updateMedicine } from './api';
import type { Medicine } from './types';

/**
 * 标签的「批量改名 / 删除」。
 *
 * 标签是存在每条药品的 tags 数组里的（见 t10 迁移的取舍），
 * 所以改一个标签名 = 把用到它的药品逐条改一遍。
 * 顺序执行、逐条写：中途断网也能把已改的存下，剩下的进 outbox。
 */

async function persistTags(boxId: string, medicine: Medicine, tags: string[]): Promise<void> {
  const input = medicineToInput(medicine, tags);

  // 离线新建还没同步的药品：只改队列，不去打服务端
  if (isLocalMedicineId(medicine.id)) {
    await enqueueUpdate(boxId, medicine.id, input);
    return;
  }

  try {
    await updateMedicine(medicine.id, input);
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    await enqueueUpdate(boxId, medicine.id, input);
  }
}

/** 把 from 改成 to；返回实际改了几条药品 */
export async function renameTag(
  boxId: string,
  medicines: readonly Medicine[],
  from: string,
  to: string,
): Promise<number> {
  const source = normalizeTag(from);
  const target = normalizeTag(to);
  if (!source) throw new Error('要改的标签不存在');
  if (!target) throw new Error('新标签不能为空');
  if (source.toLowerCase() === target.toLowerCase()) return 0;

  let changed = 0;
  for (const medicine of medicines) {
    if (!hasTag(medicine.tags, source)) continue;

    // 改名后可能和目标标签重复，sanitizeTags 会去重并保持数量上限
    const next = sanitizeTags(
      medicine.tags.map((tag) =>
        normalizeTag(tag).toLowerCase() === source.toLowerCase() ? target : tag,
      ),
    );

    await persistTags(boxId, medicine, next);
    changed += 1;
  }

  return changed;
}

/** 从整个药箱里删掉这个标签；返回实际改了几条药品 */
export async function deleteTag(
  boxId: string,
  medicines: readonly Medicine[],
  tag: string,
): Promise<number> {
  const target = normalizeTag(tag);
  if (!target) return 0;

  let changed = 0;
  for (const medicine of medicines) {
    if (!hasTag(medicine.tags, target)) continue;

    const next = medicine.tags.filter(
      (item) => normalizeTag(item).toLowerCase() !== target.toLowerCase(),
    );

    await persistTags(boxId, medicine, next);
    changed += 1;
  }

  return changed;
}
