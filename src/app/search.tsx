import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ExpiryBadge } from '@/features/medicines/expiry-badge';
import type { MedicineOverview } from '@/features/medicines/overview-api';
import { useMedicineOverview } from '@/features/medicines/overview-hooks';
import {
  AppText,
  EmptyState,
  PageHeader,
  Screen,
  colors,
  radius,
  spacing,
} from '@/shared/ui';

function ResultRow({ item, onPress }: { item: MedicineOverview; onPress: () => void }) {
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
        <AppText variant="caption">
          {(item.tags ?? []).length > 0
            ? `${item.boxName} · ${(item.tags ?? []).join('、')}`
            : item.boxName}
        </AppText>
      </View>
      <ExpiryBadge expireDate={item.expireDate} />
      <Ionicons color={colors.textSubtle} name="chevron-forward" size={16} />
    </Pressable>
  );
}

/**
 * 全局搜索：只搜「我能访问的药箱」里的药品。
 * 越权访问由数据库 RLS 兜底（不是靠前端过滤）。
 */
export default function SearchScreen() {
  const router = useRouter();
  const overview = useMedicineOverview();
  const [keyword, setKeyword] = useState('');

  const trimmed = keyword.trim().toLowerCase();

  // 名称或症状标签命中都算：搜「发烧」能翻出退烧药
  const results = useMemo(() => {
    if (!trimmed) return [];
    return (overview.data ?? []).filter(
      (item) =>
        item.name.toLowerCase().includes(trimmed) ||
        (item.tags ?? []).some((tag) => tag.toLowerCase().includes(trimmed)),
    );
  }, [overview.data, trimmed]);

  return (
    <Screen>
      <PageHeader onBack={() => router.back()} subtitle="只搜索你有权限的药箱" title="搜索药品" />

      <View style={styles.searchBar}>
        <Ionicons color={colors.textSubtle} name="search-outline" size={18} />
        <TextInput
          autoFocus
          autoCorrect={false}
          onChangeText={setKeyword}
          placeholder="药品名称或症状，比如「布洛芬」「发烧」"
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          value={keyword}
        />
        {keyword.length > 0 ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setKeyword('')}>
            <Ionicons color={colors.textSubtle} name="close-circle" size={18} />
          </Pressable>
        ) : null}
      </View>

      {overview.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : !trimmed ? (
        <EmptyState
          description="结果只包含你加入的药箱里的药品，不会出现别人的药箱。"
          title="输入关键字开始搜索"
        />
      ) : results.length === 0 ? (
        <EmptyState
          description={`没有名称或症状标签包含「${keyword.trim()}」的药品`}
          title="没有找到"
        />
      ) : (
        <View style={styles.list}>
          <AppText variant="caption">找到 {results.length} 个结果</AppText>
          {results.map((item) => (
            <ResultRow
              item={item}
              key={item.id}
              onPress={() => router.push(`/box/${item.boxId}/medicine/${item.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  input: { color: colors.text, flex: 1, fontSize: 15, paddingVertical: 0 },
  list: { gap: spacing.sm },
  row: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.85 },
  rowText: { flex: 1, gap: 2 },
});
