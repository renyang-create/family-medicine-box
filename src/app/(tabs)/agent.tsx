import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, TextInput, View } from 'react-native';

import {
  AGENT_DISCLAIMER_PER_REPLY,
  AGENT_DISCLAIMER_TOP,
  AGENT_NAME,
  AGENT_TAGLINE,
} from '@/shared/constants/agent';
import { AI_DAILY_QUOTA, AI_MAX_INPUT_CHARS } from '@/shared/constants/config';
import { AppText, EmptyState, Screen, colors, radius, spacing } from '@/shared/ui';

/**
 * 智能体页（T9 接入真实问答）。
 * 免责声明是固定静态文案，永不来自模型输出。
 */
export default function AgentScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <AppText color={colors.onPrimary} variant="subtitle">
            {AGENT_NAME.slice(0, 1)}
          </AppText>
        </View>
        <View style={styles.headerText}>
          <AppText variant="title">{AGENT_NAME}</AppText>
          <AppText variant="caption">{AGENT_TAGLINE}</AppText>
        </View>
      </View>

      <View style={styles.disclaimer}>
        <Ionicons color={colors.warningText} name="information-circle-outline" size={18} />
        <AppText color={colors.warningText} style={styles.disclaimerText} variant="caption">
          {AGENT_DISCLAIMER_TOP}
        </AppText>
      </View>

      <EmptyState
        description={`每天可问 ${AI_DAILY_QUOTA} 次；单条最多 ${AI_MAX_INPUT_CHARS} 字。`}
        title="问我用药常识"
      />

      <View style={styles.inputRow}>
        <TextInput
          editable={false}
          placeholder="T9 接入：在这里输入你的问题"
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
        />
      </View>

      <AppText variant="caption" style={styles.perReplyNote}>
        每条回复下方都会固定显示：{AGENT_DISCLAIMER_PER_REPLY}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  headerText: { flex: 1, gap: 2 },
  disclaimer: {
    backgroundColor: colors.warningBackground,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  disclaimerText: { flex: 1, lineHeight: 18 },
  inputRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  input: { color: colors.text, fontSize: 15, paddingVertical: 0 },
  perReplyNote: { lineHeight: 18 },
});
