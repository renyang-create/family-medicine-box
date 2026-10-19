import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { useMedicine } from '@/features/medicines/hooks';
import { describeNextOccurrence, ensureNotificationPermission } from '@/features/plans/notifications';
import { useApplyPlan, usePlan } from '@/features/plans/plan-hooks';
import type { MedicationPlan } from '@/features/plans/types';
import { normalizeTimeLabel, sortTimeLabels } from '@/shared/domain/time-of-day';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Screen,
  TextField,
  colors,
  radius,
  spacing,
} from '@/shared/ui';
import { showMessage } from '@/shared/utils/dialog';
import { toUserMessage } from '@/shared/utils/error-message';

const MAX_TIMES = 3;

type FormProps = {
  boxId: string;
  medicineId: string;
  medicineName: string;
  unit: string | null;
  plan: MedicationPlan | null;
};

/**
 * 表单单独抽出来，用 key=plan.id 控制重挂载，
 * 这样初始值直接来自 props，不需要在 effect 里 setState。
 */
function PlanForm({ boxId, medicineId, medicineName, unit, plan }: FormProps) {
  const [times, setTimes] = useState<string[]>(plan?.timesOfDay ?? []);
  const [dosage, setDosage] = useState(plan ? String(plan.dosageAmount) : '1');
  const [newTime, setNewTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const applyPlan = useApplyPlan(medicineId);

  function handleAddTime() {
    setError(null);
    const normalized = normalizeTimeLabel(newTime);
    if (!normalized) {
      setError('时间格式应为 08:00（24 小时制）');
      return;
    }
    if (times.includes(normalized)) {
      setError('这个时间已经加过了');
      return;
    }
    if (times.length >= MAX_TIMES) {
      setError(`最多设置 ${MAX_TIMES} 个提醒时间`);
      return;
    }
    setTimes(sortTimeLabels([...times, normalized]));
    setNewTime('');
  }

  function handleRemoveTime(value: string) {
    setTimes(times.filter((item) => item !== value));
  }

  async function handleSave() {
    const parsedDosage = Number(dosage);
    if (!Number.isFinite(parsedDosage) || parsedDosage <= 0) {
      setError('每次剂量必须大于 0');
      return;
    }
    if (times.length === 0) {
      setError('请至少添加一个提醒时间');
      return;
    }

    setError(null);
    setFeedback(null);

    const granted = await ensureNotificationPermission();
    if (!granted && Platform.OS !== 'web') {
      showMessage(
        '需要通知权限',
        '没有通知权限就无法在到点时提醒你。请到手机「设置 → 应用 → 家庭药箱 → 通知」里打开。',
      );
      return;
    }

    try {
      await applyPlan.mutateAsync({
        boxId,
        medicineId,
        medicineName,
        unit,
        dosageAmount: parsedDosage,
        times,
      });
      setFeedback(
        Platform.OS === 'web'
          ? '计划已保存。网页版不会弹通知，请在手机上验证到点提醒。'
          : `已设置：每天 ${times.join('、')} 提醒`,
      );
    } catch (cause) {
      setError(toUserMessage(cause));
    }
  }

  async function handleDisable() {
    try {
      await applyPlan.mutateAsync({
        boxId,
        medicineId,
        medicineName,
        unit,
        dosageAmount: Number(dosage) || 1,
        times: [],
      });
      setTimes([]);
      setFeedback('已关闭这个药品的吃药提醒');
    } catch (cause) {
      setError(toUserMessage(cause));
    }
  }

  return (
    <>
      <Card style={styles.card}>
        <AppText variant="subtitle">每天提醒时间</AppText>
        <AppText variant="caption">到点由手机本地通知提醒，断网也会响。</AppText>

        {times.length === 0 ? (
          <AppText variant="caption">还没有设置时间</AppText>
        ) : (
          <View style={styles.chips}>
            {times.map((value) => (
              <View key={value} style={styles.chip}>
                <View style={styles.chipText}>
                  <AppText variant="bodyStrong">{value}</AppText>
                  <AppText variant="caption">{describeNextOccurrence(value)}</AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => handleRemoveTime(value)}
                >
                  <AppText color={colors.dangerText} variant="caption">
                    删除
                  </AppText>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.addRow}>
          <View style={styles.flex}>
            <TextField
              hint="24 小时制，如 08:00"
              label="添加时间"
              maxLength={5}
              onChangeText={setNewTime}
              placeholder="08:00"
              value={newTime}
            />
          </View>
          <Button label="添加" onPress={handleAddTime} variant="secondary" />
        </View>
      </Card>

      <Card style={styles.card}>
        <TextField
          hint={`每次吃多少${unit ? `（${unit}）` : ''}`}
          keyboardType="decimal-pad"
          label="每次剂量"
          onChangeText={setDosage}
          value={dosage}
        />

        {error ? (
          <AppText color={colors.dangerText} variant="caption">
            {error}
          </AppText>
        ) : null}
        {feedback ? (
          <AppText color={colors.success} variant="caption">
            {feedback}
          </AppText>
        ) : null}

        <Button
          disabled={applyPlan.isPending}
          label={applyPlan.isPending ? '保存中…' : '保存提醒'}
          onPress={handleSave}
        />

        {plan ? (
          <Button label="关闭这个药品的提醒" onPress={handleDisable} variant="secondary" />
        ) : null}
      </Card>

      <AppText variant="caption">
        提醒只是时间提示，不构成用药建议。剂量与频次请遵医嘱或说明书。
      </AppText>
    </>
  );
}

export default function PlanScreen() {
  const router = useRouter();
  const { boxId, medicineId } = useLocalSearchParams<{ boxId: string; medicineId: string }>();

  const medicineQuery = useMedicine(medicineId ?? '');
  const planQuery = usePlan(medicineId ?? '');
  const medicine = medicineQuery.data;

  if (!medicine) {
    return (
      <Screen>
        <PageHeader onBack={() => router.back()} title="吃药提醒" />
        <EmptyState description="药品可能已被删除" title="没有找到药品" />
      </Screen>
    );
  }

  const unit = medicine.unit ?? '';

  return (
    <Screen>
      <PageHeader
        onBack={() => router.back()}
        subtitle={unit ? `${medicine.name} · 单位 ${unit}` : medicine.name}
        title="吃药提醒"
      />

      <PlanForm
        boxId={boxId ?? ''}
        key={planQuery.data?.id ?? 'new'}
        medicineId={medicine.id}
        medicineName={medicine.name}
        plan={planQuery.data ?? null}
        unit={medicine.unit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  chips: { gap: spacing.sm },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: { gap: 2 },
  addRow: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
