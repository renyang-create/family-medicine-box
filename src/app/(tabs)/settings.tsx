import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';
import { BOX_MEMBER_LIMIT, INVITE_CODE_LENGTH } from '@/shared/constants/config';
import { AGENT_DISCLAIMER_TOP } from '@/shared/constants/agent';
import { AppText, Card, Screen, colors, spacing } from '@/shared/ui';

function Row({ label, hint }: { label: string; hint?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText variant="body">{label}</AppText>
        {hint ? <AppText variant="caption">{hint}</AppText> : null}
      </View>
      <Ionicons color={colors.textSubtle} name="chevron-forward" size={16} />
    </View>
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

/** 设置：药箱管理入口 + 通知设置 + 关于（T3/T6/T8 逐项接入） */
export default function SettingsScreen() {
  const { session } = useAuth();

  return (
    <Screen>
      <AppText variant="title">设置</AppText>
      <AppText variant="caption">{session?.user.email ?? '未登录'}</AppText>

      <Section title="药箱">
        <Row hint="创建后自动成为创建者" label="创建药箱（T3）" />
        <Row hint={`${INVITE_CODE_LENGTH} 位邀请码，忽略大小写与空格`} label="用邀请码加入（T3）" />
        <Row hint={`每箱最多 ${BOX_MEMBER_LIMIT} 人`} label="我加入的药箱" />
        <Row hint="创建者需先转让才能退出（药箱不能无主）" label="成员与转让（T3）" />
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

      <AppText variant="caption" style={styles.version}>
        家庭药箱 v0.1.0（MVP 骨架）
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
  about: { gap: spacing.xs, padding: spacing.lg },
  aboutText: { lineHeight: 18 },
  version: { textAlign: 'center' },
});
