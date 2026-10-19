import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useMyBoxes } from '@/features/boxes/hooks';
import { applyOutboxToOverview } from '@/features/sync/apply-outbox';
import { useOutboxOps } from '@/features/sync/use-outbox';

import { fetchMedicineOverview } from './overview-api';

export const overviewKeys = {
  all: ['medicines', 'overview'] as const,
};

/**
 * 跨药箱概览 = 服务端数据 + 本地未同步队列。
 * 和药箱内列表一致：断网时看到的是「已经改好了」的版本。
 */
export function useMedicineOverview() {
  const query = useQuery({
    queryKey: overviewKeys.all,
    queryFn: fetchMedicineOverview,
    staleTime: 30_000,
  });

  const ops = useOutboxOps();
  const boxes = useMyBoxes();

  const boxNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const box of boxes.data ?? []) map[box.boxId] = box.name;
    return map;
  }, [boxes.data]);

  const data = useMemo(
    () => applyOutboxToOverview(query.data ?? [], ops, boxNames),
    [query.data, ops, boxNames],
  );

  return { ...query, data };
}
