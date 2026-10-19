import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ExpiryBadge } from '@/features/medicines/expiry-badge';
import { useDeleteMedicine, useMedicine } from '@/features/medicines/hooks';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Screen,
  colors,
  spacing,
} from '@/shared/ui';
import { confirmDialog, showMessage } from '@/shared/utils/dialog';
import { toUserMessage } from '@/shared/utils/error-message';
import { formatQuantity } from '@/shared/utils/number';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="caption">{label}</AppText>
      <AppText style={styles.value} variant="body">
        {value}
      </AppText>
    </View>
  );
}

export default function MedicineDetailScreen() {
  const router = useRouter();
  const { boxId, medicineId } = useLocalSearchParams<{ boxId: string; medicineId: string }>();

  const medicineQuery = useMedicine(medicineId ?? '');
  const deleteMedicine = useDeleteMedicine(boxId ?? '');
  const medicine = medicineQuery.data;

  async function handleDelete() {
    const confirmed = await confirmDialog({
      title: '删除药品',
      message: '删除后不会出现在列表里（数据保留，可在 P2 恢复）。确定删除吗？',
      confirmText: '删除',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await deleteMedicine.mutateAsync(medicineId ?? '');
      router.back();
    } catch (cause) {
      showMessage('删除失败', toUserMessage(cause));
    }
  }

  if (medicineQuery.isLoading) {
    return (
      <Screen>
        <PageHeader onBack={() => router.back()} title="药品" />
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!medicine) {
    return (
      <Screen>
        <PageHeader onBack={() => router.back()} title="药品" />
        <EmptyState description="可能已经被删除" title="没有找到这个药品">
          <Button label="返回" onPress={() => router.back()} variant="secondary" />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader onBack={() => router.back()} title={medicine.name} />

      <Card style={styles.info}>
        <View style={styles.titleRow}>
          <AppText variant="subtitle">{medicine.name}</AppText>
          <ExpiryBadge expireDate={medicine.expireDate} />
        </View>

        <InfoRow label="规格" value={medicine.spec ?? '未填写'} />
        <InfoRow
          label="剩余数量"
          value={`${formatQuantity(medicine.quantity)}${medicine.unit ?? ''}`}
        />
        <InfoRow label="用法用量" value={medicine.dosage ?? '未填写'} />
        <InfoRow label="存放位置" value={medicine.storageLocation ?? '未填写'} />
        <InfoRow label="有效期" value={medicine.expireDate ?? '未填写'} />
        <InfoRow label="生产日期" value={medicine.producedOn ?? '未填写'} />
        <InfoRow label="生产批次" value={medicine.batchNo ?? '未填写'} />
        <InfoRow label="备注" value={medicine.notes ?? '未填写'} />
      </Card>

      <EmptyState description="「记录本次服药」与服药历史将在 T5 接入。" title="服药历史" />

      <Button
        label="编辑药品"
        onPress={() => router.push(`/box/${boxId}/medicine/${medicine.id}/edit`)}
      />
      <Button
        disabled={deleteMedicine.isPending}
        label={deleteMedicine.isPending ? '删除中…' : '删除药品'}
        onPress={handleDelete}
        variant="secondary"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: spacing.xl },
  info: { gap: spacing.sm },
  titleRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  value: { flex: 1, textAlign: 'right' },
});
