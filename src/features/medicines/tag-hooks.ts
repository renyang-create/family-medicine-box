import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { toUserMessage } from '@/shared/utils/error-message';

import { medicineKeys } from './hooks';
import { deleteTag, renameTag } from './tag-service';
import type { Medicine } from './types';

type RenameInput = { medicines: readonly Medicine[]; from: string; to: string };
type DeleteInput = { medicines: readonly Medicine[]; tag: string };

/**
 * 标签改名 / 删除的交互状态。
 * 批量写可能要跑好几次请求，所以带 busy 标记，避免连点。
 */
export function useTagEditor(boxId: string) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: medicineKeys.byBox(boxId) });
    await queryClient.invalidateQueries({ queryKey: medicineKeys.all });
  }

  async function run(task: () => Promise<number>): Promise<number | null> {
    if (busy) return null;
    setBusy(true);
    setError(null);
    try {
      const changed = await task();
      await refresh();
      return changed;
    } catch (cause) {
      setError(toUserMessage(cause));
      return null;
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    error,
    clearError: () => setError(null),
    rename: ({ medicines, from, to }: RenameInput) => run(() => renameTag(boxId, medicines, from, to)),
    remove: ({ medicines, tag }: DeleteInput) => run(() => deleteTag(boxId, medicines, tag)),
  };
}
