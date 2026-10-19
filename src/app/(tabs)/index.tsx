import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';
import { AGENT_NAME, HOME_AGENT_CTA, HOME_AGENT_SUB } from '@/shared/constants/agent';
import { AppText, Button, EmptyState, Screen, colors, radius, spacing } from '@/shared/ui';

/**
 * 首页：顶部全局搜索 + 中部我加入的药箱列表 + 底部任阳入口。
 * T1 只做结构与文案；药箱数据、搜索、过期徽标分别在 T3 / T6 接入。
 */
export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="title">我的药箱</AppText>
          <AppText variant="caption">{session?.user.email ?? '未登录'}</AppText>
        </View>
        {/* 顶部徽标：T6 接入「临期 + 过期」数量 */}
        <View style={styles.badge}>
          <AppText variant="caption" color={colors.textSubtle}>
            提醒
          </AppText>
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <Ionicons color={colors.textSubtle} name="search-outline" size={18} />
        <TextInput
          editable={false}
          placeholder="搜索药品名称或标签"
          placeholderTextColor={colors.textSubtle}
          style={styles.searchInput}
        />
      </View>
      <AppText variant="caption">
        全局搜索在 T3 接入：只检索你可访问药箱内的药品与标签，不会命中无权限药箱。
      </AppText>

      <EmptyState
        title="还没有药箱"
        description="创建一个药箱，或用 6 位邀请码加入家人的药箱（每个药箱最多 5 人）。"
      >
        <Button disabled label="创建药箱（T3）" onPress={() => {}} />
        <Button disabled label="用邀请码加入（T3）" onPress={() => {}} variant="secondary" />
      </EmptyState>

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
  searchWrapper: {
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
  searchInput: { color: colors.text, flex: 1, fontSize: 15, paddingVertical: 0 },
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
  pressed: { opacity: 0.85 },
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
