import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  dissolveBox,
  fetchBoxMembers,
  leaveBox,
  removeBoxMember,
  resetInviteCode,
  transferBoxCreator,
} from './members-api';
import { boxKeys } from './hooks';

export const memberKeys = {
  all: ['boxes', 'members'] as const,
  byBox: (boxId: string) => [...memberKeys.all, boxId] as const,
};

export function useBoxMembers(boxId: string) {
  return useQuery({
    queryKey: memberKeys.byBox(boxId),
    queryFn: () => fetchBoxMembers(boxId),
    enabled: Boolean(boxId),
  });
}

/** 成员/邀请码变动后，成员列表与首页药箱卡片都要重取 */
function useInvalidateBoxes(boxId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: memberKeys.byBox(boxId) });
    void queryClient.invalidateQueries({ queryKey: boxKeys.all });
  };
}

export function useResetInviteCode(boxId: string) {
  const invalidate = useInvalidateBoxes(boxId);
  return useMutation({
    mutationFn: () => resetInviteCode(boxId),
    onSuccess: invalidate,
  });
}

export function useRemoveMember(boxId: string) {
  const invalidate = useInvalidateBoxes(boxId);
  return useMutation({
    mutationFn: (userId: string) => removeBoxMember(boxId, userId),
    onSuccess: invalidate,
  });
}

export function useTransferCreator(boxId: string) {
  const invalidate = useInvalidateBoxes(boxId);
  return useMutation({
    mutationFn: (userId: string) => transferBoxCreator(boxId, userId),
    onSuccess: invalidate,
  });
}

export function useLeaveBox(boxId: string) {
  const invalidate = useInvalidateBoxes(boxId);
  return useMutation({
    mutationFn: () => leaveBox(boxId),
    onSuccess: invalidate,
  });
}

export function useDissolveBox(boxId: string) {
  const invalidate = useInvalidateBoxes(boxId);
  return useMutation({
    mutationFn: () => dissolveBox(boxId),
    onSuccess: invalidate,
  });
}
