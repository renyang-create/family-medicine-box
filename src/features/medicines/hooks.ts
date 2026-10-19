import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createMedicine,
  fetchMedicine,
  fetchMedicines,
  softDeleteMedicine,
  updateMedicine,
} from './api';
import type { MedicineInput } from './types';

export const medicineKeys = {
  all: ['medicines'] as const,
  byBox: (boxId: string) => [...medicineKeys.all, 'box', boxId] as const,
  detail: (id: string) => [...medicineKeys.all, 'detail', id] as const,
};

export function useMedicines(boxId: string) {
  return useQuery({
    queryKey: medicineKeys.byBox(boxId),
    queryFn: () => fetchMedicines(boxId),
    enabled: Boolean(boxId),
  });
}

export function useMedicine(id: string) {
  return useQuery({
    queryKey: medicineKeys.detail(id),
    queryFn: () => fetchMedicine(id),
    enabled: Boolean(id),
  });
}

/** 任何药品写操作成功后，箱内列表与首页都要失效重取 */
function useInvalidateMedicines(boxId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: medicineKeys.byBox(boxId) });
    void queryClient.invalidateQueries({ queryKey: medicineKeys.all });
  };
}

export function useCreateMedicine(boxId: string) {
  const invalidate = useInvalidateMedicines(boxId);
  return useMutation({
    mutationFn: (input: MedicineInput) => createMedicine(boxId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateMedicine(boxId: string, id: string) {
  const invalidate = useInvalidateMedicines(boxId);
  return useMutation({
    mutationFn: (input: MedicineInput) => updateMedicine(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteMedicine(boxId: string) {
  const invalidate = useInvalidateMedicines(boxId);
  return useMutation({
    mutationFn: (id: string) => softDeleteMedicine(id),
    onSuccess: invalidate,
  });
}
