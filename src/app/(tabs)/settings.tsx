import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { signOut } from '@/features/auth/api';
import { useAuth } from '@/providers/auth-provider';
import { AGENT_DISCLAIMER_TOP } from '@/shared/constants/agent';
import { BOX_MEMBER_LIMIT, INVITE_CODE_LENGTH } from '@/shared/constants/config';
import { AppText, Button, Card, Screen, colors, spacing } from '@/shared/ui';
import { toUserMessage } from '@/shared/utils/error-message';

type RowProps = {
  label: string;
  hint?: string;
  onPress?: () => void;
};

function Row({ label, hint, onPress }: RowProps) {
  const content = (
    <>
      <View style={styles.rowText}>
        <AppText variant="body">{label}</AppText>
        {hint ? <AppText variant="caption">{hint}</AppText> : null}
      </View>
      {onPress ? <Ionicons color={colors.textSubtle} name="chevron-forward" size={16} /> : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="caption">{title}</AppText>
      <Card style={styles.card}>{children}</Card>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { session } = useAuth();

  function handleSignOut() {
    Alert.alert('退出登录', '退出后需要重新登录才能看到药箱。', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: () => {
          void signOut().catch((cause) => {
            Alert.alert('退出失败', toUserMessage(cause));
          });
        },
      },
    ]);
  }

  return (
    <Screen>
      <AppText variant="title">设置</AppText>
      <AppText variant="caption">{session?.user.email ?? '未登录'}</AppText>

      <Section title="药箱">
        <Row label="创建药箱" onPress={() => router.push('/box/new')} />
        <Row
          hint={`${INVITE_CODE_LENGTH} 位邀请码，忽略大小写与空格`}
          label="用邀请码加入"
          onPress={() => router.push('/box/join')}
        />
        <Row hint={`每箱最多 ${BOX_MEMBER_LIMIT} 人`} label="我加入的药箱（首页）" />
        <Row hint="创建者需先转让才能退出（药箱不能无主）" label="成员与转让（T5 接入）" />
      </Section>

      <Section title="提醒">
        <Row hint="T8 接入：本地通知调度" label="吃药提醒" />
        <Row hint="仅 App 内标红，不发系统推送" label="过期提醒" />
      </Section>

      <Section title="关于">
        <View style={styles.about}>
          <AppText variant="bodyStrong">关于任阳</AppText>
          <AppText variant="caption" style={styles.aboutText}>
            {AGENT_DISCLAIMER_TOP}
          </AppText>
        </View>
      </Section>

      <Button label="退出登录" onPress={handleSignOut} variant="secondary" />

      <AppText variant="caption" style={styles.version}>
        家庭药箱 v0.1.0（MVP · T3）
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  card: { gap: 0, padding: 0 },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.85 },
  about: { gap: spacing.xs, padding: spacing.lg },
  aboutText: { lineHeight: 18 },
  version: { textAlign: 'center' },
});
