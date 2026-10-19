import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createBox, fetchMyBoxes, joinBox } from './api';

export const boxKeys = {
  all: ['boxes'] as const,
  mine: () => [...boxKeys.all, 'mine'] as const,
};

export function useMyBoxes() {
  return useQuery({
    queryKey: boxKeys.mine(),
    queryFn: fetchMyBoxes,
    staleTime: 10_000,
  });
}

export function useCreateBox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBox,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boxKeys.all }),
  });
}

export function useJoinBox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinBox,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boxKeys.all }),
  });
}
