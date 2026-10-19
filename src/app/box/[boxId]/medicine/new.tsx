import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useCreateMedicine } from '@/features/medicines/hooks';
import { MedicineForm } from '@/features/medicines/medicine-form';
import type { MedicineInput } from '@/features/medicines/types';
import { PageHeader, Screen } from '@/shared/ui';
import { toUserMessage } from '@/shared/utils/error-message';

export default function NewMedicineScreen() {
  const router = useRouter();
  const { boxId } = useLocalSearchParams<{ boxId: string }>();
  const createMedicine = useCreateMedicine(boxId ?? '');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(input: MedicineInput) {
    try {
      await createMedicine.mutateAsync(input);
      router.back();
    } catch (cause) {
      setError(toUserMessage(cause));
    }
  }

  return (
    <Screen>
      <PageHeader
        onBack={() => router.back()}
        subtitle="有效期留空也可以，填了会自动提醒"
        title="添加药品"
      />
      <MedicineForm
        onSubmit={handleSubmit}
        serverError={error}
        submitLabel="保存"
        submitting={createMedicine.isPending}
      />
    </Screen>
  );
}
