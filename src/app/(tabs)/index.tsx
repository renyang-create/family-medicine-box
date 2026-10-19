import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useMyBoxes } from '@/features/boxes/hooks';
import { useMedicineOverview } from '@/features/medicines/overview-hooks';
import { useAuth } from '@/providers/auth-provider';
import { AGENT_NAME, HOME_AGENT_CTA, HOME_AGENT_SUB } from '@/shared/constants/agent';
import { groupByExpiry } from '@/shared/domain/expiry-groups';
import { AppText, Button, EmptyState, Screen, colors, radius, spacing } from '@/shared/ui';
import { formatInviteCodeForDisplay } from '@/shared/utils/normalize-invite-code';

/**
 * 首页：顶部全局搜索 + 过期徽标；中部我加入的药箱；底部任阳入口。
 */
export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const boxesQuery = useMyBoxes();
  const overview = useMedicineOverview();

  const boxes = boxesQuery.data ?? [];
  const alertGroups = useMemo(() => groupByExpiry(overview.data ?? []), [overview.data]);
  const alertCount = alertGroups.total;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="title">我的药箱</AppText>
          <AppText variant="caption">{session?.user.email ?? '未登录'}</AppText>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/reminders')}
          style={({ pressed }) => [
            styles.badge,
            alertCount > 0 ? styles.badgeAlert : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <AppText
            color={alertCount > 0 ? colors.onPrimary : colors.textSubtle}
            variant="caption"
          >
            {alertCount > 0 ? `提醒 ${alertCount}` : '提醒'}
          </AppText>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/search')}
        style={({ pressed }) => [styles.searchBar, pressed ? styles.pressed : null]}
      >
        <Ionicons color={colors.textSubtle} name="search-outline" size={18} />
        <AppText color={colors.textSubtle} style={styles.searchText} variant="body">
          搜索药品名称
        </AppText>
        <Ionicons color={colors.textSubtle} name="chevron-forward" size={16} />
      </Pressable>

      {boxesQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="caption">正在读取药箱…</AppText>
        </View>
      ) : boxesQuery.isError ? (
        <EmptyState description="可能是网络问题，点下面重试" title="药箱列表加载失败">
          <Button label="重试" onPress={() => void boxesQuery.refetch()} variant="secondary" />
        </EmptyState>
      ) : boxes.length === 0 ? (
        <EmptyState
          description="创建一个药箱，或用 6 位邀请码加入家人的药箱（每个药箱最多 5 人）。"
          title="还没有药箱"
        >
          <Button label="创建药箱" onPress={() => router.push('/box/new')} />
          <Button
            label="用邀请码加入"
            onPress={() => router.push('/box/join')}
            variant="secondary"
          />
        </EmptyState>
      ) : (
        <View style={styles.list}>
          {boxes.map((box) => (
            <Pressable
              accessibilityRole="button"
              key={box.boxId}
              onPress={() => router.push(`/box/${box.boxId}`)}
              style={({ pressed }) => [styles.boxCard, pressed ? styles.pressed : null]}
            >
              <View style={styles.boxTop}>
                <AppText variant="subtitle" style={styles.boxName}>
                  {box.name}
                </AppText>
                {box.role === 'creator' ? (
                  <View style={styles.roleTag}>
                    <AppText color={colors.primary} variant="caption">
                      创建者
                    </AppText>
                  </View>
                ) : null}
              </View>

              <AppText variant="caption">
                成员 {box.memberCount}/5
                {box.inviteCode ? ` · 邀请码 ${formatInviteCodeForDisplay(box.inviteCode)}` : ''}
              </AppText>

              <View style={styles.boxFooter}>
                <AppText color={colors.primary} variant="caption">
                  查看药品
                </AppText>
                <Ionicons color={colors.textSubtle} name="chevron-forward" size={16} />
              </View>
            </Pressable>
          ))}

          <View style={styles.actions}>
            <Button label="创建药箱" onPress={() => router.push('/box/new')} />
            <Button
              label="用邀请码加入"
              onPress={() => router.push('/box/join')}
              variant="secondary"
            />
          </View>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/agent')}
        style={({ pressed }) => [styles.agentCard, pressed ? styles.pressed : null]}
      >
        <View style={styles.agentAvatar}>
          <AppText color={colors.onPrimary} variant="subtitle">
            {AGENT_NAME.slice(0, 1)}
          </AppText>
        </View>
        <View style={styles.agentText}>
          <AppText variant="bodyStrong">{HOME_AGENT_CTA}</AppText>
          <AppText variant="caption">{HOME_AGENT_SUB}</AppText>
        </View>
        <Ionicons color={colors.textSubtle} name="chevron-forward" size={18} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerText: { gap: spacing.xs },
  badge: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeAlert: { backgroundColor: colors.danger },
  pressed: { opacity: 0.85 },
  searchBar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  searchText: { flex: 1 },
  loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  list: { gap: spacing.md },
  boxCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  boxTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  boxName: { flex: 1 },
  roleTag: {
    backgroundColor: '#EFF8FF',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  boxFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  agentCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  agentAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  agentText: { flex: 1, gap: 2 },
});
