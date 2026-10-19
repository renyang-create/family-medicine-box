import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useMedicine, useUpdateMedicine } from '@/features/medicines/hooks';
import { MedicineForm } from '@/features/medicines/medicine-form';
import type { MedicineInput } from '@/features/medicines/types';
import { EmptyState, PageHeader, Screen, colors, spacing } from '@/shared/ui';
import { toUserMessage } from '@/shared/utils/error-message';

export default function EditMedicineScreen() {
  const router = useRouter();
  const { boxId, medicineId } = useLocalSearchParams<{ boxId: string; medicineId: string }>();

  const medicineQuery = useMedicine(medicineId ?? '');
  const updateMedicine = useUpdateMedicine(boxId ?? '', medicineId ?? '');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(input: MedicineInput) {
    try {
      await updateMedicine.mutateAsync(input);
      router.back();
    } catch (cause) {
      setError(toUserMessage(cause));
    }
  }

  if (medicineQuery.isLoading) {
    return (
      <Screen>
        <PageHeader onBack={() => router.back()} title="编辑药品" />
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!medicineQuery.data) {
    return (
      <Screen>
        <PageHeader onBack={() => router.back()} title="编辑药品" />
        <EmptyState description="可能已经被删除" title="没有找到这个药品" />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader onBack={() => router.back()} title="编辑药品" />
      <MedicineForm
        initial={medicineQuery.data}
        onSubmit={handleSubmit}
        serverError={error}
        submitLabel="保存修改"
        submitting={updateMedicine.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: spacing.xl },
});
