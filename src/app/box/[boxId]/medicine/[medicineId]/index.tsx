import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useMyBoxes } from '@/features/boxes/hooks';
import { ExpiryBadge } from '@/features/medicines/expiry-badge';
import { useDeleteMedicine, useMedicine } from '@/features/medicines/hooks';
import { usePlan } from '@/features/plans/plan-hooks';
import { useRecordUsage, useUndoUsage, useUsageLogs } from '@/features/medicines/usage-hooks';
import type { UsageLog } from '@/features/medicines/usage-api';
import { useAuth } from '@/providers/auth-provider';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Screen,
  TextField,
  colors,
  spacing,
} from '@/shared/ui';
import { confirmDialog, showMessage } from '@/shared/utils/dialog';
import { formatLocalDateTime } from '@/shared/utils/datetime';
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

function UsageLogRow({
  log,
  canUndo,
  onUndo,
}: {
  log: UsageLog;
  canUndo: boolean;
  onUndo: () => void;
}) {
  return (
    <View style={styles.logRow}>
      <View style={styles.logText}>
        <AppText variant="bodyStrong">
          {formatLocalDateTime(log.takenAt)}
          {log.userName ? ` · ${log.userName}` : ''}
        </AppText>
        <AppText variant="caption">
          剂量 {formatQuantity(log.dosageAmount)}
          {log.quantityDeducted > 0 ? ` · 扣减 ${formatQuantity(log.quantityDeducted)}` : ' · 库存为 0 未扣减'}
          {log.note ? ` · ${log.note}` : ''}
        </AppText>
      </View>
      {canUndo ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onUndo}>
          <AppText color={colors.dangerText} variant="caption">
            撤销
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function MedicineDetailScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { boxId, medicineId } = useLocalSearchParams<{ boxId: string; medicineId: string }>();

  const medicineQuery = useMedicine(medicineId ?? '');
  const medicine = medicineQuery.data;

  const boxesQuery = useMyBoxes();
  const isCreator = boxesQuery.data?.find((item) => item.boxId === boxId)?.role === 'creator';

  const logsQuery = useUsageLogs(medicineId ?? '');
  const planQuery = usePlan(medicineId ?? '');
  const recordUsage = useRecordUsage(boxId ?? '', medicineId ?? '');
  const undoUsage = useUndoUsage(boxId ?? '', medicineId ?? '');
  const deleteMedicine = useDeleteMedicine(boxId ?? '');

  const [dosage, setDosage] = useState('1');
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  async function handleRecord() {
    const parsedDosage = Number(dosage);
    if (!Number.isFinite(parsedDosage) || parsedDosage <= 0) {
      setRecordError('剂量必须大于 0');
      return;
    }

    setRecordError(null);
    setFeedback(null);
    try {
      const result = await recordUsage.mutateAsync({ dosage: parsedDosage, note });
      const unit = medicine?.unit ?? '';
      setFeedback(
        result.quantityDeducted > 0
          ? `已记录，扣减 ${formatQuantity(result.quantityDeducted)}${unit}，剩余 ${formatQuantity(result.quantityLeft)}${unit}`
          : `已记录。当前库存为 0，本次没有扣减数量`,
      );
      setNote('');
    } catch (cause) {
      setRecordError(toUserMessage(cause));
    }
  }

  async function handleUndo(logId: string) {
    const confirmed = await confirmDialog({
      title: '撤销这条服药记录',
      message: '撤销后会把扣减的数量加回库存。',
      confirmText: '撤销',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await undoUsage.mutateAsync(logId);
      setFeedback('已撤销，库存已回补');
    } catch (cause) {
      showMessage('撤销失败', toUserMessage(cause));
    }
  }

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

  const unit = medicine.unit ?? '';
  const logs = logsQuery.data ?? [];

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
          value={`${formatQuantity(medicine.quantity)}${unit}`}
        />
        <InfoRow label="用法用量" value={medicine.dosage ?? '未填写'} />
        <InfoRow label="存放位置" value={medicine.storageLocation ?? '未填写'} />
        <InfoRow label="有效期" value={medicine.expireDate ?? '未填写'} />
        <InfoRow label="生产日期" value={medicine.producedOn ?? '未填写'} />
        <InfoRow label="生产批次" value={medicine.batchNo ?? '未填写'} />
        <InfoRow label="备注" value={medicine.notes ?? '未填写'} />
      </Card>

      <Card style={styles.recordCard}>
        <AppText variant="subtitle">记录本次服药</AppText>
        <View style={styles.recordRow}>
          <View style={styles.flex}>
            <TextField
              keyboardType="decimal-pad"
              label={`本次剂量${unit ? `（${unit}）` : ''}`}
              onChangeText={setDosage}
              placeholder="1"
              value={dosage}
            />
          </View>
          <View style={styles.flexLarge}>
            <TextField
              label="备注"
              maxLength={60}
              onChangeText={setNote}
              placeholder="选填，比如「饭后」"
              value={note}
            />
          </View>
        </View>

        {recordError ? (
          <AppText color={colors.dangerText} variant="caption">
            {recordError}
          </AppText>
        ) : null}
        {feedback ? (
          <AppText color={colors.success} variant="caption">
            {feedback}
          </AppText>
        ) : null}

        <Button
          disabled={recordUsage.isPending}
          label={recordUsage.isPending ? '记录中…' : '记录本次服药'}
          onPress={handleRecord}
        />
        <AppText variant="caption">
          记录后会自动扣减库存；库存为 0 时只写记录、不再扣减。
        </AppText>
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/box/${boxId}/medicine/${medicine.id}/plan`)}
        style={({ pressed }) => [styles.planCard, pressed ? styles.pressed : null]}
      >
        <Ionicons color={colors.textMuted} name="alarm-outline" size={18} />
        <View style={styles.planText}>
          <AppText variant="bodyStrong">吃药提醒</AppText>
          <AppText variant="caption">
            {planQuery.data
              ? `每天 ${planQuery.data.timesOfDay.join('、')} · 每次 ${formatQuantity(planQuery.data.dosageAmount)}${unit}`
              : '还没有设置（仅你自己可见）'}
          </AppText>
        </View>
        <Ionicons color={colors.textSubtle} name="chevron-forward" size={16} />
      </Pressable>

      <Card style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <AppText variant="subtitle">服药历史</AppText>
          <AppText variant="caption">{logs.length > 0 ? `最近 ${logs.length} 条` : ''}</AppText>
        </View>

        {logsQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : logs.length === 0 ? (
          <AppText variant="caption">还没有服药记录</AppText>
        ) : (
          logs.map((log) => (
            <UsageLogRow
              canUndo={log.userId === session?.user.id || isCreator}
              key={log.id}
              log={log}
              onUndo={() => void handleUndo(log.id)}
            />
          ))
        )}
      </Card>

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
  recordCard: { gap: spacing.md },
  recordRow: { flexDirection: 'row', gap: spacing.md },
  planCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  planText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.85 },
  flex: { width: 120 },
  flexLarge: { flex: 1 },
  historyCard: { gap: spacing.sm },
  historyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  logText: { flex: 1, gap: 2 },
});
