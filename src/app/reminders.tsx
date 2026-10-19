import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ExpiryBadge } from '@/features/medicines/expiry-badge';
import type { MedicineOverview } from '@/features/medicines/overview-api';
import { useMedicineOverview } from '@/features/medicines/overview-hooks';
import { groupByExpiry } from '@/shared/domain/expiry-groups';
import {
  AppText,
  Button,
  EmptyState,
  PageHeader,
  Screen,
  colors,
  radius,
  spacing,
} from '@/shared/ui';

function AlertRow({ item, onPress }: { item: MedicineOverview; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <View style={styles.rowText}>
        <AppText numberOfLines={1} variant="bodyStrong">
          {item.name}
        </AppText>
        <AppText variant="caption">{item.boxName}</AppText>
      </View>
      <ExpiryBadge expireDate={item.expireDate} />
      <Ionicons color={colors.textSubtle} name="chevron-forward" size={16} />
    </Pressable>
  );
}

/** 提醒列表：只做 App 内提醒，不发系统推送（MVP 口径） */
export default function RemindersScreen() {
  const router = useRouter();
  const overview = useMedicineOverview();
  const groups = useMemo(() => groupByExpiry(overview.data ?? []), [overview.data]);

  return (
    <Screen>
      <PageHeader
        onBack={() => router.back()}
        subtitle={
          overview.data
            ? `只在 App 内提醒 · 已检查 ${overview.data.length} 件药品`
            : '只在 App 内提醒，不会发系统通知'
        }
        title="药品提醒"
      />

      {overview.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="caption">正在检查有效期…</AppText>
        </View>
      ) : overview.isError ? (
        <EmptyState description="可能是网络问题" title="加载失败">
          <Button label="重试" onPress={() => void overview.refetch()} variant="secondary" />
        </EmptyState>
      ) : groups.total === 0 ? (
        <EmptyState
          description={`已检查 ${overview.data?.length ?? 0} 件药品。30 天内到期的会出现在这里；如果药品没填有效期，就不会被提醒。`}
          title="暂无提醒"
        />
      ) : (
        <>
          {groups.expired.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.dangerDot} />
                <AppText color={colors.dangerText} variant="bodyStrong">
                  已过期 {groups.expired.length} 件
                </AppText>
              </View>
              <View style={styles.list}>
                {groups.expired.map((item) => (
                  <AlertRow
                    item={item}
                    key={item.id}
                    onPress={() => router.push(`/box/${item.boxId}/medicine/${item.id}`)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {groups.nearExpiry.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.warningDot} />
                <AppText color={colors.warningText} variant="bodyStrong">
                  30 天内到期 {groups.nearExpiry.length} 件
                </AppText>
              </View>
              <View style={styles.list}>
                {groups.nearExpiry.map((item) => (
                  <AlertRow
                    item={item}
                    key={item.id}
                    onPress={() => router.push(`/box/${item.boxId}/medicine/${item.id}`)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  section: { gap: spacing.sm },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  dangerDot: {
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  warningDot: {
    backgroundColor: colors.warning,
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  list: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.85 },
  rowText: { flex: 1, gap: 2 },
});
