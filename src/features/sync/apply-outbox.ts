import type { MedicineOverview } from '@/features/medicines/overview-api';
import type { Medicine, MedicineInput } from '@/features/medicines/types';
import { getExpiryStatus } from '@/shared/domain/expiry';
import { sanitizeTags } from '@/shared/domain/tags';

import { isLocalMedicineId } from './local-id';
import type { OutboxOp } from './outbox';

/**
 * 把「还没同步的写操作」叠加到服务端数据上，得到界面要显示的结果。
 *
 * 纯函数（带单测）：不碰网络、不碰缓存，只做合并，
 * 这样离线新增 / 修改 / 删除的表现可以被稳定测试。
 */

function toMedicine(boxId: string, id: string, input: MedicineInput): Medicine {
  return {
    id,
    boxId,
    name: input.name,
    spec: input.spec ?? null,
    quantity: input.quantity,
    unit: input.unit ?? null,
    dosage: input.dosage ?? null,
    storageLocation: input.storageLocation ?? null,
    batchNo: input.batchNo ?? null,
    producedOn: input.producedOn ?? null,
    expireDate: input.expireDate ?? null,
    expiryStatus: getExpiryStatus(input.expireDate ?? null),
    notes: input.notes ?? null,
    lastTakenAt: null,
    tags: sanitizeTags(input.tags),
  };
}

function mergeMedicine(current: Medicine, input: MedicineInput): Medicine {
  return {
    ...current,
    name: input.name,
    spec: input.spec ?? null,
    quantity: input.quantity,
    unit: input.unit ?? null,
    dosage: input.dosage ?? null,
    storageLocation: input.storageLocation ?? null,
    batchNo: input.batchNo ?? null,
    producedOn: input.producedOn ?? null,
    expireDate: input.expireDate ?? null,
    expiryStatus: getExpiryStatus(input.expireDate ?? null),
    notes: input.notes ?? null,
    tags: sanitizeTags(input.tags),
  };
}

/**
 * @param medicines 服务端返回的列表（可能来自离线缓存）
 * @param ops 本地待同步队列
 * @param boxId 只合并这个药箱的操作；不传则全部合并
 */
export function applyOutbox(
  medicines: readonly Medicine[],
  ops: readonly OutboxOp[],
  boxId?: string,
): Medicine[] {
  let result = [...medicines];

  for (const op of ops) {
    if (boxId && op.boxId !== boxId) continue;

    if (op.kind === 'create') {
      if (!op.input) continue;
      // 同一条 create 可能已经被合并过一次
      if (result.some((item) => item.id === op.medicineId)) continue;
      result = [...result, toMedicine(op.boxId, op.medicineId, op.input)];
      continue;
    }

    if (op.kind === 'update') {
      if (!op.input) continue;
      result = result.map((item) =>
        item.id === op.medicineId ? mergeMedicine(item, op.input as MedicineInput) : item,
      );
      continue;
    }

    result = result.filter((item) => item.id !== op.medicineId);
  }

  return result;
}

/** 详情页用：把队列里针对这个 id 的修改合并进去 */
export function applyOutboxToMedicine(
  medicine: Medicine | undefined,
  ops: readonly OutboxOp[],
  medicineId: string,
): Medicine | undefined {
  const related = ops.filter((op) => op.medicineId === medicineId);
  if (related.length === 0) return medicine;

  const merged = applyOutbox(medicine ? [medicine] : [], related);
  return merged[0];
}

/**
 * 首页概览（跨药箱）也叠加离线队列：
 * 概览只用到名字 / 过期日 / 标签，所以合并时也只补这几个字段。
 * 新建但还没同步的药品，箱名从本地药箱列表补，取不到就显示「待同步」。
 */
export function applyOutboxToOverview(
  items: readonly MedicineOverview[],
  ops: readonly OutboxOp[],
  boxNames: Record<string, string> = {},
): MedicineOverview[] {
  let result = [...items];

  for (const op of ops) {
    if (op.kind === 'create') {
      if (!op.input) continue;
      if (result.some((item) => item.id === op.medicineId)) continue;
      result = [
        ...result,
        {
          id: op.medicineId,
          boxId: op.boxId,
          boxName: boxNames[op.boxId] ?? '待同步',
          name: op.input.name,
          expireDate: op.input.expireDate ? op.input.expireDate : null,
          tags: sanitizeTags(op.input.tags),
        },
      ];
      continue;
    }

    if (op.kind === 'update') {
      const input = op.input;
      if (!input) continue;
      result = result.map((item) =>
        item.id === op.medicineId
          ? {
              ...item,
              name: input.name,
              expireDate: input.expireDate ? input.expireDate : null,
              tags: sanitizeTags(input.tags),
            }
          : item,
      );
      continue;
    }

    result = result.filter((item) => item.id !== op.medicineId);
  }

  return result;
}

/**
 * 断网时新建的药品：本地 id 还没换成服务端 id。
 * 判断依据是前缀，避免详情页拿 `local-xxx` 去查服务端（必然 404）。
 */
export function isPendingMedicineId(id: string | undefined): boolean {
  return Boolean(id && isLocalMedicineId(id));
}
