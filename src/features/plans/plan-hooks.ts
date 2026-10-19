import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchPlan } from './plan-api';
import { applyPlan } from './plan-service';

export const planKeys = {
  all: ['plans'] as const,
  byMedicine: (medicineId: string) => [...planKeys.all, medicineId] as const,
};

export function usePlan(medicineId: string) {
  return useQuery({
    queryKey: planKeys.byMedicine(medicineId),
    queryFn: () => fetchPlan(medicineId),
    enabled: Boolean(medicineId),
  });
}

export type ApplyPlanInput = {
  boxId: string;
  medicineId: string;
  medicineName: string;
  unit: string | null;
  dosageAmount: number;
  times: string[];
};

export function useApplyPlan(medicineId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyPlanInput) => applyPlan(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planKeys.byMedicine(medicineId) }),
  });
}
