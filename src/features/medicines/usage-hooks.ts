import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchUsageLogs, recordUsage, undoUsage } from './usage-api';
import { medicineKeys } from './hooks';

export const usageKeys = {
  all: ['usage-logs'] as const,
  byMedicine: (medicineId: string) => [...usageKeys.all, medicineId] as const,
};

export function useUsageLogs(medicineId: string, limit = 10) {
  return useQuery({
    queryKey: [...usageKeys.byMedicine(medicineId), limit],
    queryFn: () => fetchUsageLogs(medicineId, limit),
    enabled: Boolean(medicineId),
  });
}

/** 记录服药后：历史、药品详情、箱内列表都要重取（列表排序依赖 last_taken_at） */
function useInvalidateUsage(boxId: string, medicineId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: usageKeys.byMedicine(medicineId) });
    void queryClient.invalidateQueries({ queryKey: medicineKeys.detail(medicineId) });
    void queryClient.invalidateQueries({ queryKey: medicineKeys.byBox(boxId) });
  };
}

export function useRecordUsage(boxId: string, medicineId: string) {
  const invalidate = useInvalidateUsage(boxId, medicineId);
  return useMutation({
    mutationFn: (input: { dosage: number; note?: string }) =>
      recordUsage(medicineId, input.dosage, input.note),
    onSuccess: invalidate,
  });
}

export function useUndoUsage(boxId: string, medicineId: string) {
  const invalidate = useInvalidateUsage(boxId, medicineId);
  return useMutation({
    mutationFn: (logId: string) => undoUsage(logId),
    onSuccess: invalidate,
  });
}
