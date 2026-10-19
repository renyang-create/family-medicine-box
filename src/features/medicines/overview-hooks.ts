import { useQuery } from '@tanstack/react-query';

import { fetchMedicineOverview } from './overview-api';

export const overviewKeys = {
  all: ['medicines', 'overview'] as const,
};

export function useMedicineOverview() {
  return useQuery({
    queryKey: overviewKeys.all,
    queryFn: fetchMedicineOverview,
    staleTime: 30_000,
  });
}
