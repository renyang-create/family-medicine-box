import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useMyBoxes } from '@/features/boxes/hooks';
import { AppText, Button, Card, EmptyState, PageHeader, Screen, colors, spacing } from '@/shared/ui';
import { formatInviteCodeForDisplay } from '@/shared/utils/normalize-invite-code';

/**
 * 药箱详情。T3 只显示基本信息；
 * 药品列表 / 添加药品 / 标签筛选在 T4 接入。
 */
export default function BoxDetailScreen() {
  const router = useRouter();
  const { boxId } = useLocalSearchParams<{ boxId: string }>();
  const boxesQuery = useMyBoxes();
  const box = boxesQuery.data?.find((item) => item.boxId === boxId);

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
        subtitle={`成员 ${box.memberCount}/5`}
        title={box.name}
      />

      <Card style={styles.info}>
        <View style={styles.row}>
          <AppText variant="caption">我的身份</AppText>
          <AppText variant="bodyStrong">{box.role === 'creator' ? '创建者' : '成员'}</AppText>
        </View>

        {box.inviteCode ? (
          <View style={styles.row}>
            <AppText variant="caption">邀请码</AppText>
            <AppText variant="bodyStrong">{formatInviteCodeForDisplay(box.inviteCode)}</AppText>
          </View>
        ) : null}
      </Card>

      <EmptyState
        description="药品列表、添加药品、标签筛选将在 T4 接入。"
        title="这个药箱还没有药品"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: { gap: spacing.sm },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
});
