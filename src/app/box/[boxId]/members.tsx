import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useMyBoxes } from '@/features/boxes/hooks';
import {
  useBoxMembers,
  useDissolveBox,
  useLeaveBox,
  useRemoveMember,
  useResetInviteCode,
  useTransferCreator,
} from '@/features/boxes/members-hooks';
import { useAuth } from '@/providers/auth-provider';
import {
  AppText,
  Button,
  Card,
  PageHeader,
  Screen,
  colors,
  radius,
  spacing,
} from '@/shared/ui';
import { copyText } from '@/shared/utils/clipboard';
import { confirmDialog, showMessage } from '@/shared/utils/dialog';
import { toUserMessage } from '@/shared/utils/error-message';
import { formatInviteCodeForDisplay } from '@/shared/utils/normalize-invite-code';

export default function MembersScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { boxId } = useLocalSearchParams<{ boxId: string }>();

  const boxesQuery = useMyBoxes();
  const box = boxesQuery.data?.find((item) => item.boxId === boxId);

  const membersQuery = useBoxMembers(boxId ?? '');
  const resetInviteCode = useResetInviteCode(boxId ?? '');
  const removeMember = useRemoveMember(boxId ?? '');
  const transferCreator = useTransferCreator(boxId ?? '');
  const leaveBox = useLeaveBox(boxId ?? '');
  const dissolveBox = useDissolveBox(boxId ?? '');

  const [hint, setHint] = useState<string | null>(null);

  const members = membersQuery.data ?? [];
  const myRole = members.find((member) => member.userId === session?.user.id)?.role;
  const isCreator = myRole === 'creator';
  const inviteCode = box?.inviteCode ?? null;
  const onlyMe = members.length <= 1;

  async function handleCopy() {
    if (!inviteCode) return;
    const formatted = formatInviteCodeForDisplay(inviteCode);
    const ok = await copyText(formatted);
    setHint(ok ? `已复制：${formatted}` : `请手动复制：${formatted}`);
  }

  async function handleReset() {
    const confirmed = await confirmDialog({
      title: '重置邀请码',
      message: '旧邀请码会立刻失效。已经加入的成员不受影响。',
      confirmText: '重置',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const next = await resetInviteCode.mutateAsync();
      setHint(`新邀请码：${formatInviteCodeForDisplay(next)}（旧码已失效）`);
    } catch (cause) {
      showMessage('重置失败', toUserMessage(cause));
    }
  }

  async function handleRemove(userId: string, name: string) {
    const confirmed = await confirmDialog({
      title: '移除成员',
      message: `移除后「${name}」将看不到这个药箱的药品与记录。确定移除吗？`,
      confirmText: '移除',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await removeMember.mutateAsync(userId);
      setHint(`已移除 ${name}`);
    } catch (cause) {
      showMessage('移除失败', toUserMessage(cause));
    }
  }

  async function handleTransfer(userId: string, name: string) {
    const confirmed = await confirmDialog({
      title: '转让药箱',
      message: `转让给「${name}」后，你会变成普通成员，无法再管理成员或重置邀请码。确定转让吗？`,
      confirmText: '转让',
    });
    if (!confirmed) return;

    try {
      await transferCreator.mutateAsync(userId);
      setHint(`已把药箱转让给 ${name}`);
    } catch (cause) {
      showMessage('转让失败', toUserMessage(cause));
    }
  }

  async function handleLeave() {
    if (isCreator) {
      showMessage(
        '需要先转让',
        '你是创建者，药箱不能没有创建者。请先把药箱转让给其他成员；如果只剩你一个人，请使用「解散药箱」。',
      );
      return;
    }

    const confirmed = await confirmDialog({
      title: '退出药箱',
      message: '退出后你将看不到这个药箱的药品与记录。',
      confirmText: '退出',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await leaveBox.mutateAsync();
      router.replace('/(tabs)');
    } catch (cause) {
      showMessage('退出失败', toUserMessage(cause));
    }
  }

  async function handleDissolve() {
    const confirmed = await confirmDialog({
      title: '解散药箱',
      message: '解散后，这个药箱里的药品和服药记录都会被删除（软删除，数据保留但不可见）。此操作不可自助恢复。',
      confirmText: '解散',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await dissolveBox.mutateAsync();
      router.replace('/(tabs)');
    } catch (cause) {
      showMessage('解散失败', toUserMessage(cause));
    }
  }

  return (
    <Screen>
      <PageHeader
        onBack={() => router.back()}
        subtitle={box ? `${box.name} · 成员 ${members.length}/5` : '成员与邀请码'}
        title="成员与邀请码"
      />

      <Card style={styles.codeCard}>
        <AppText variant="caption">邀请码</AppText>
        <AppText variant="hero" style={styles.code}>
          {inviteCode ? formatInviteCodeForDisplay(inviteCode) : '——'}
        </AppText>
        <AppText variant="caption">
          把这个码发给家人，对方在首页点「用邀请码加入」即可。每个药箱最多 5 人。
        </AppText>

        {hint ? (
          <AppText color={colors.success} variant="caption">
            {hint}
          </AppText>
        ) : null}

        <View style={styles.codeActions}>
          <Button label="复制邀请码" onPress={handleCopy} variant="secondary" />
          {isCreator ? (
            <Button
              disabled={resetInviteCode.isPending}
              label={resetInviteCode.isPending ? '重置中…' : '重置邀请码'}
              onPress={handleReset}
              variant="secondary"
            />
          ) : null}
        </View>
      </Card>

      <Card style={styles.memberCard}>
        <View style={styles.memberHeader}>
          <AppText variant="subtitle">成员</AppText>
          <AppText variant="caption">{members.length}/5</AppText>
        </View>

        {membersQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : members.length === 0 ? (
          <AppText variant="caption">还没有成员信息</AppText>
        ) : (
          members.map((member) => {
            const isMe = member.userId === session?.user.id;
            const name = member.displayName ?? (isMe ? '我' : '家人');
            return (
              <View key={member.userId} style={styles.memberRow}>
                <View style={styles.memberTop}>
                  <View style={styles.avatar}>
                    <AppText color={colors.onPrimary} variant="bodyStrong">
                      {name.slice(0, 1)}
                    </AppText>
                  </View>
                  <View style={styles.memberText}>
                    <AppText variant="bodyStrong">
                      {name}
                      {isMe ? '（我）' : ''}
                    </AppText>
                    <AppText variant="caption">
                      {member.role === 'creator' ? '创建者' : '成员'}
                    </AppText>
                  </View>
                </View>

                {isCreator && !isMe ? (
                  <View style={styles.memberActions}>
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={6}
                      onPress={() => void handleTransfer(member.userId, name)}
                    >
                      <AppText color={colors.primary} variant="caption">
                        转让给他
                      </AppText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={6}
                      onPress={() => void handleRemove(member.userId, name)}
                    >
                      <AppText color={colors.dangerText} variant="caption">
                        移除
                      </AppText>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </Card>

      {isCreator && onlyMe ? (
        <>
          <Button
            disabled={dissolveBox.isPending}
            label={dissolveBox.isPending ? '解散中…' : '解散药箱'}
            onPress={handleDissolve}
            variant="secondary"
          />
          <AppText variant="caption">
            你是唯一成员，退出等于解散药箱。解散后药品与记录都会从你的列表里消失。
          </AppText>
        </>
      ) : isCreator ? (
        <>
          <Button label="退出药箱" onPress={handleLeave} variant="secondary" />
          <AppText variant="caption">
            你是创建者，需要先把药箱转让给其他成员才能退出（药箱不能没有创建者）。
          </AppText>
        </>
      ) : (
        <>
          <Button
            disabled={leaveBox.isPending}
            label={leaveBox.isPending ? '退出中…' : '退出药箱'}
            onPress={handleLeave}
            variant="secondary"
          />
          <AppText variant="caption">退出后你将不再看到这个药箱里的药品与记录。</AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeCard: { alignItems: 'center', gap: spacing.sm },
  code: { letterSpacing: 4 },
  codeActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, width: '100%' },
  memberCard: { gap: spacing.md },
  memberHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  memberRow: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  memberTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  memberText: { flex: 1, gap: 2 },
  memberActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'flex-end',
  },
});
