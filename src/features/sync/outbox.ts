import AsyncStorage from '@react-native-async-storage/async-storage';

import { createMedicine, softDeleteMedicine, updateMedicine } from '@/features/medicines/api';
import type { MedicineInput } from '@/features/medicines/types';
import { queryClient } from '@/lib/query-client';
import { isNetworkError } from '@/shared/utils/network';

import { createLocalMedicineId, isLocalMedicineId } from './local-id';

/**
 * 离线 outbox（写入队列）。
 *
 * 思路：断网时不去死等请求超时，而是把写操作原样存进本地队列，
 * 界面用「乐观数据」顶上；联网后按顺序重放，服务端结果再覆盖本地缓存。
 *
 * 为什么不用 React Query 的 paused mutations：
 * - paused mutation 存在内存里，App 被杀就丢了（Android 上很常见）
 * - 新增药品需要「本地临时 id → 服务端 id」的映射，React Query 没有这个概念
 *
 * 冲突策略（与 query-client.ts 的注释一致）：客户端最新修改优先，
 * 同一个药品的多次操作按入队顺序串行执行。
 */

const OUTBOX_KEY = 'fmb.outbox.v1';
const ID_MAP_KEY = 'fmb.outbox.idmap.v1';

export type OutboxKind = 'create' | 'update' | 'delete';

export type OutboxOp = {
  /** 队列内唯一 id */
  id: string;
  kind: OutboxKind;
  boxId: string;
  /** create 时是本地临时 id；update/delete 时是目标 id（也可能指向本地临时 id） */
  medicineId: string;
  /** create/update 的完整表单值（离线期间以客户端为准） */
  input?: MedicineInput;
  createdAt: string;
  attempts: number;
};

type IdMap = Record<string, string>;

let ops: OutboxOp[] = [];
let idMap: IdMap = {};
let hydrated = false;
let hydrating: Promise<void> | null = null;
let flushing = false;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function randomId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function parseOps(raw: string | null): OutboxOp[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is OutboxOp => {
      const op = item as OutboxOp;
      return Boolean(op?.id && op?.kind && op?.boxId && op?.medicineId);
    });
  } catch {
    return [];
  }
}

export function subscribeOutbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 给 useSyncExternalStore 用：引用只在队列变化时更换 */
export function getOutboxSnapshot(): OutboxOp[] {
  return ops;
}

async function persist(): Promise<void> {
  await AsyncStorage.multiSet([
    [OUTBOX_KEY, JSON.stringify(ops)],
    [ID_MAP_KEY, JSON.stringify(idMap)],
  ]).catch(() => undefined);
}

/** 冷启动读一次本地队列（幂等） */
export async function hydrateOutbox(): Promise<void> {
  if (hydrated) return;
  if (hydrating) return hydrating;

  hydrating = (async () => {
    const [[, rawOps], [, rawMap]] = await AsyncStorage.multiGet([OUTBOX_KEY, ID_MAP_KEY]).catch(
      () => [
        [OUTBOX_KEY, null],
        [ID_MAP_KEY, null],
      ],
    );

    ops = parseOps(rawOps ?? null);
    try {
      const parsed = JSON.parse(rawMap ?? '{}') as unknown;
      idMap = parsed && typeof parsed === 'object' ? (parsed as IdMap) : {};
    } catch {
      idMap = {};
    }

    hydrated = true;
    hydrating = null;
    emit();
  })();

  return hydrating;
}

/** 登出时清空：outbox 不跨账号，避免把 A 的修改重放到 B 的账号上 */
export async function clearOutbox(): Promise<void> {
  ops = [];
  idMap = {};
  hydrated = true;
  emit();
  await AsyncStorage.multiRemove([OUTBOX_KEY, ID_MAP_KEY]).catch(() => undefined);
}

function push(op: OutboxOp): void {
  ops = [...ops, op];
  emit();
  void persist();
}

/** 注意：入队前必须先 hydrate，否则会用空队列覆盖掉上次存的队列 */
export async function enqueueCreate(boxId: string, input: MedicineInput): Promise<string> {
  await hydrateOutbox();
  const localId = createLocalMedicineId();
  push({
    id: randomId('op-'),
    kind: 'create',
    boxId,
    medicineId: localId,
    input,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  return localId;
}

export async function enqueueUpdate(
  boxId: string,
  medicineId: string,
  input: MedicineInput,
): Promise<void> {
  await hydrateOutbox();
  push({
    id: randomId('op-'),
    kind: 'update',
    boxId,
    medicineId,
    input,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
}

export async function enqueueDelete(boxId: string, medicineId: string): Promise<void> {
  await hydrateOutbox();
  push({
    id: randomId('op-'),
    kind: 'delete',
    boxId,
    medicineId,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
}

function remove(opId: string): void {
  ops = ops.filter((item) => item.id !== opId);
  emit();
}

/**
 * 撤销一条「离线新建」：它还没上服务端，把队列里所有相关操作删掉就算删除了，
 * 不用再排一条 delete 去追一个服务端根本不存在的 id。
 */
export async function discardLocalMedicine(localId: string): Promise<void> {
  await hydrateOutbox();
  ops = ops.filter((op) => op.medicineId !== localId);
  emit();
  await persist();
}

/** 本地临时 id → 服务端 id */
export function resolveMedicineId(id: string): string {
  return idMap[id] ?? id;
}

/** 已同步的临时 id 映射（服务端 id） */
export function getServerIdForLocal(localId: string): string | undefined {
  return idMap[localId];
}

export type FlushResult = {
  /** 本次成功重放的条数 */
  synced: number;
  /** 队列剩余条数 */
  pending: number;
};

/**
 * 按顺序重放队列。
 * - 网络错误：立即停止（后面的操作也不能保证顺序），把错误抛给调用方去安排重试
 * - 其它错误（RLS / 数据被删 / 校验失败）：丢弃这一条并继续，避免毒丸卡死整个队列
 */
export async function flushOutbox(): Promise<FlushResult> {
  await hydrateOutbox();
  if (flushing) return { synced: 0, pending: ops.length };

  flushing = true;
  let synced = 0;

  try {
    while (ops.length > 0) {
      const op = ops[0];
      if (!op) break;

      try {
        // create 成功后 applyOp 会写入「临时 id → 服务端 id」映射，再出队
        await applyOp(op);
        remove(op.id);
        synced += 1;
      } catch (error) {
        if (isNetworkError(error)) throw error;
        remove(op.id);
      }

      await persist();
    }
  } finally {
    flushing = false;
    if (synced > 0) {
      void queryClient.invalidateQueries({ queryKey: ['medicines'] });
      void queryClient.invalidateQueries({ queryKey: ['usage-logs'] });
    }
  }

  return { synced, pending: ops.length };
}

async function applyOp(op: OutboxOp): Promise<void> {
  const targetId = resolveMedicineId(op.medicineId);

  if (op.kind === 'create') {
    const created = await createMedicine(op.boxId, op.input ?? { name: '未命名药品', quantity: 0 });
    idMap = { ...idMap, [op.medicineId]: created.id };
    return;
  }

  // create 还没成功（被丢弃）时，后续基于它的操作直接跳过
  if (isLocalMedicineId(targetId)) return;

  if (op.kind === 'update') {
    if (!op.input) return;
    await updateMedicine(targetId, op.input);
    return;
  }

  await softDeleteMedicine(targetId);
}
