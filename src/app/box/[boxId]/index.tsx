import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useMyBoxes } from '@/features/boxes/hooks';
import { useMedicines } from '@/features/medicines/hooks';
import { MedicineRow } from '@/features/medicines/medicine-row';
import { usePendingCount } from '@/features/sync/use-outbox';
import { getExpiryStatus } from '@/shared/domain/expiry';
import { sortMedicines } from '@/shared/domain/medicine-sort';
import { collectTags, filterByTags, hasTag, toggleTag } from '@/shared/domain/tags';
import { AppText, Button, Card, Chip, EmptyState, PageHeader, Screen, colors, radius, spacing } from '@/shared/ui';
import { formatInviteCodeForDisplay } from '@/shared/utils/normalize-invite-code';

/**
 * 药箱详情：药品列表（过期置顶 + 最近服药倒序）。
 */
export default function BoxDetailScreen() {
  const router = useRouter();
  const { boxId } = useLocalSearchParams<{ boxId: string }>();

  const boxesQuery = useMyBoxes();
  const box = boxesQuery.data?.find((item) => item.boxId === boxId);

  const medicinesQuery = useMedicines(boxId ?? '');
  const medicines = medicinesQuery.data;
  const pendingCount = usePendingCount(boxId ?? '');

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const tagOptions = useMemo(() => collectTags(medicines ?? []), [medicines]);
  const filtered = useMemo(
    () => filterByTags(medicines ?? [], selectedTags),
    [medicines, selectedTags],
  );
  const sorted = useMemo(() => sortMedicines(filtered), [filtered]);
  const expiredCount = useMemo(
    () => (medicines ?? []).filter((item) => getExpiryStatus(item.expireDate) === 'expired').length,
    [medicines],
  );

  if (!box) {
    return (
      <Screen>
        <PageHeader onBack={() => router.back()} title="药箱" />
        <EmptyState
          description={boxesQuery.isLoading ? '正在读取…' : '这个药箱可能已经被删除，或者你已不是成员'}
          title={boxesQuery.isLoading ? '加载中' : '没有找到药箱'}
        >
          <Button label="刷新" onPress={() => void boxesQuery.refetch()} variant="secondary" />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader
        onBack={() => router.back()}
        subtitle={`成员 ${box.memberCount}/5${box.inviteCode ? ` · 邀请码 ${formatInviteCodeForDisplay(box.inviteCode)}` : ''}`}
        title={box.name}
      />

      {expiredCount > 0 ? (
        <Card style={styles.alert}>
          <View style={styles.alertBar} />
          <AppText color={colors.dangerText} variant="bodyStrong">
            有 {expiredCount} 件药品已过期，已置顶显示
          </AppText>
        </Card>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/box/${boxId}/members`)}
        style={({ pressed }) => [styles.memberEntry, pressed ? styles.pressed : null]}
      >
        <Ionicons color={colors.textMuted} name="people-outline" size={18} />
        <View style={styles.memberEntryText}>
          <AppText variant="body">成员与邀请码</AppText>
          <AppText variant="caption">
            成员 {box.memberCount}/5
            {box.inviteCode ? ` · 邀请码 ${formatInviteCodeForDisplay(box.inviteCode)}` : ''}
          </AppText>
        </View>
        <Ionicons color={colors.textSubtle} name="chevron-forward" size={16} />
      </Pressable>

      <Button
        label="+ 添加药品"
        onPress={() => router.push(`/box/${boxId}/medicine/new`)}
        variant="secondary"
      />

      {pendingCount > 0 ? (
        <Card style={styles.syncBanner}>
          <AppText color={colors.warningText} variant="caption">
            有 {pendingCount} 条离线改动待同步，联网后会自动补上
          </AppText>
        </Card>
      ) : null}

      {tagOptions.length > 0 ? (
        <View style={styles.filters}>
          <View style={styles.filterHeader}>
            <AppText variant="caption">按症状筛选</AppText>
            <View style={styles.filterActions}>
              {selectedTags.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setSelectedTags([])}
                >
                  <AppText color={colors.primary} variant="caption">
                    清除筛选
                  </AppText>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => router.push(`/box/${boxId}/tags`)}
              >
                <AppText color={colors.textMuted} variant="caption">
                  管理标签
                </AppText>
              </Pressable>
            </View>
          </View>
          <View style={styles.chipWrap}>
            {tagOptions.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onPress={() => setSelectedTags(toggleTag(selectedTags, tag))}
                selected={hasTag(selectedTags, tag)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {medicinesQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="caption">正在读取药品…</AppText>
        </View>
      ) : medicinesQuery.isError ? (
        <EmptyState description="可能是网络问题" title="药品列表加载失败">
          <Button label="重试" onPress={() => void medicinesQuery.refetch()} variant="secondary" />
        </EmptyState>
      ) : (medicines ?? []).length === 0 ? (
        <EmptyState
          description="把家里的药录进来，过期会自动标红提醒。"
          title="这个药箱还没有药品"
        >
          <Button
            label="添加第一件药品"
            onPress={() => router.push(`/box/${boxId}/medicine/new`)}
          />
        </EmptyState>
      ) : sorted.length === 0 ? (
        <EmptyState description="换个标签试试，或者清除筛选。" title="没有符合筛选的药品">
          <Button label="清除筛选" onPress={() => setSelectedTags([])} variant="secondary" />
        </EmptyState>
      ) : (
        <View style={styles.list}>
          {sorted.map((medicine) => (
            <MedicineRow
              key={medicine.id}
              medicine={medicine}
              onPress={() => router.push(`/box/${boxId}/medicine/${medicine.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  alert: {
    alignItems: 'center',
    backgroundColor: colors.dangerBackground,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  alertBar: {
    backgroundColor: colors.danger,
    borderRadius: 2,
    height: 28,
    width: 6,
  },
  loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  list: { gap: spacing.md },
  syncBanner: {
    backgroundColor: colors.warningBackground,
    borderColor: colors.warningBackground,
    paddingVertical: spacing.md,
  },
  filters: { gap: spacing.sm },
  filterHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  memberEntry: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  memberEntryText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.85 },
});
