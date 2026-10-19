import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { applyOutbox, applyOutboxToMedicine } from '@/features/sync/apply-outbox';
import { isLocalMedicineId } from '@/features/sync/local-id';
import {
  discardLocalMedicine,
  enqueueCreate,
  enqueueDelete,
  enqueueUpdate,
} from '@/features/sync/outbox';
import { useOutboxOps } from '@/features/sync/use-outbox';
import { isNetworkError } from '@/shared/utils/network';

import {
  createMedicine,
  fetchMedicine,
  fetchMedicines,
  softDeleteMedicine,
  updateMedicine,
} from './api';
import type { Medicine, MedicineInput } from './types';

export const medicineKeys = {
  all: ['medicines'] as const,
  byBox: (boxId: string) => [...medicineKeys.all, 'box', boxId] as const,
  detail: (id: string) => [...medicineKeys.all, 'detail', id] as const,
};

/**
 * 列表 = 服务端数据 + 本地未同步队列。
 * 断网时 query 会返回持久化缓存，队列里的新增/修改再叠上去，用户看到的就是「已经改好了」。
 */
export function useMedicines(boxId: string) {
  const query = useQuery({
    queryKey: medicineKeys.byBox(boxId),
    queryFn: () => fetchMedicines(boxId),
    enabled: Boolean(boxId),
  });

  const ops = useOutboxOps();
  const data = useMemo(() => applyOutbox(query.data ?? [], ops, boxId), [query.data, ops, boxId]);

  return { ...query, data };
}

export function useMedicine(id: string) {
  const isLocal = isLocalMedicineId(id);
  const query = useQuery({
    queryKey: medicineKeys.detail(id),
    queryFn: () => fetchMedicine(id),
    // 本地临时 id 服务端不认识，不能去查
    enabled: Boolean(id) && !isLocal,
  });

  const ops = useOutboxOps();
  const data = useMemo(() => applyOutboxToMedicine(query.data, ops, id), [query.data, ops, id]);

  return { ...query, data };
}

/** 任何药品写操作成功后，箱内列表与首页都要失效重取 */
function useInvalidateMedicines(boxId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: medicineKeys.byBox(boxId) });
    void queryClient.invalidateQueries({ queryKey: medicineKeys.all });
  };
}

/**
 * 写操作统一套路：先直连服务端；
 * 只有「网络不通」这种可恢复错误才转存 outbox，等联网自动补。
 * 其它错误（权限、校验）照旧抛给页面提示。
 */
export function useCreateMedicine(boxId: string) {
  const invalidate = useInvalidateMedicines(boxId);
  return useMutation({
    mutationFn: async (input: MedicineInput): Promise<Medicine | null> => {
      try {
        return await createMedicine(boxId, input);
      } catch (error) {
        if (!isNetworkError(error)) throw error;
        await enqueueCreate(boxId, input);
        return null;
      }
    },
    onSuccess: invalidate,
  });
}

export function useUpdateMedicine(boxId: string, id: string) {
  const invalidate = useInvalidateMedicines(boxId);
  return useMutation({
    mutationFn: async (input: MedicineInput): Promise<Medicine | null> => {
      // 离线新建的药品还没有服务端 id，直接改队列里的 create 之后的值
      if (isLocalMedicineId(id)) {
        await enqueueUpdate(boxId, id, input);
        return null;
      }

      try {
        return await updateMedicine(id, input);
      } catch (error) {
        if (!isNetworkError(error)) throw error;
        await enqueueUpdate(boxId, id, input);
        return null;
      }
    },
    onSuccess: invalidate,
  });
}

export function useDeleteMedicine(boxId: string) {
  const invalidate = useInvalidateMedicines(boxId);
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // 离线新建的药品还没上服务端，直接把它从队列里撤掉即可
      if (isLocalMedicineId(id)) {
        await discardLocalMedicine(id);
        return;
      }
      try {
        await softDeleteMedicine(id);
      } catch (error) {
        if (!isNetworkError(error)) throw error;
        await enqueueDelete(boxId, id);
      }
    },
    onSuccess: invalidate,
  });
}
