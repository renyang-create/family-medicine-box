import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAgentConversation, useAgentMessages, useAgentQuota, useSendMessage } from '@/features/agent/hooks';
import {
  AGENT_DISCLAIMER_PER_REPLY,
  AGENT_DISCLAIMER_TOP,
  AGENT_NAME,
  AGENT_PRESET_QUESTIONS,
  AGENT_QUOTA_EXCEEDED,
  AGENT_TAGLINE,
} from '@/shared/constants/agent';
import { AI_DAILY_QUOTA, AI_MAX_INPUT_CHARS } from '@/shared/constants/config';
import { AppText, colors, radius, spacing } from '@/shared/ui';
import { toUserMessage } from '@/shared/utils/error-message';

export default function AgentScreen() {
  const conversation = useAgentConversation();
  const conversationId = conversation.data;
  const messagesQuery = useAgentMessages(conversationId);
  const quota = useAgentQuota();
  const send = useSendMessage(conversationId);

  const [input, setInput] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const messages = messagesQuery.data ?? [];
  const remaining = quota.data?.remaining ?? AI_DAILY_QUOTA;

  async function handleSend(preset?: string) {
    const question = (preset ?? input).trim();
    if (!question || send.isPending) return;

    setInput('');
    setNotice(null);

    try {
      const result = await send.mutateAsync(question);
      if (result.source === 'quota') setNotice(AGENT_QUOTA_EXCEEDED);
      else if (result.source === 'local') {
        setNotice('现在连不上模型，先用本地常识回答你。');
      }
    } catch (cause) {
      setNotice(toUserMessage(cause));
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
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
          <View style={styles.quotaChip}>
            <AppText variant="caption">今日剩余 {remaining} 次</AppText>
          </View>
        </View>

        {/* 固定静态免责声明：不来自模型输出 */}
        <View style={styles.disclaimer}>
          <Ionicons color={colors.warningText} name="information-circle-outline" size={18} />
          <AppText color={colors.warningText} style={styles.disclaimerText} variant="caption">
            {AGENT_DISCLAIMER_TOP}
          </AppText>
        </View>

        <ScrollView
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          ref={scrollRef}
        >
          {messages.length === 0 && !send.isPending ? (
            <View style={styles.empty}>
              <AppText variant="bodyStrong">可以问我这些</AppText>
              {AGENT_PRESET_QUESTIONS.map((question) => (
                <Pressable
                  accessibilityRole="button"
                  key={question}
                  onPress={() => void handleSend(question)}
                  style={({ pressed }) => [styles.preset, pressed ? styles.pressed : null]}
                >
                  <AppText variant="caption">{question}</AppText>
                </Pressable>
              ))}
            </View>
          ) : null}

          {messages.map((message) => (
            <View key={message.id} style={styles.messageBlock}>
              <View
                style={[
                  styles.bubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <AppText color={message.role === 'user' ? colors.onPrimary : colors.text}>
                  {message.content}
                </AppText>
              </View>

              {/* 每一条 AI 回复下方固定渲染免责提示 */}
              {message.role === 'assistant' ? (
                <AppText style={styles.perReply} variant="caption">
                  {AGENT_DISCLAIMER_PER_REPLY}
                </AppText>
              ) : null}
            </View>
          ))}

          {send.isPending ? (
            <View style={[styles.bubble, styles.assistantBubble, styles.typing]}>
              <ActivityIndicator color={colors.textSubtle} size="small" />
              <AppText variant="caption">任阳正在想…</AppText>
            </View>
          ) : null}

          {notice ? (
            <AppText color={colors.warningText} style={styles.notice} variant="caption">
              {notice}
            </AppText>
          ) : null}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            maxLength={AI_MAX_INPUT_CHARS}
            multiline
            onChangeText={setInput}
            placeholder="问我用药常识，不做诊断"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            value={input}
          />
          <Pressable
            accessibilityRole="button"
            disabled={send.isPending || input.trim().length === 0}
            onPress={() => void handleSend()}
            style={({ pressed }) => [
              styles.sendButton,
              send.isPending || input.trim().length === 0 ? styles.sendDisabled : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Ionicons color={colors.onPrimary} name="arrow-up" size={18} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerText: { flex: 1, gap: 2 },
  quotaChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  disclaimer: {
    backgroundColor: colors.warningBackground,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  disclaimerText: { flex: 1, lineHeight: 18 },
  messages: { gap: spacing.md, padding: spacing.lg },
  empty: { gap: spacing.sm },
  preset: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  messageBlock: { gap: 4 },
  bubble: {
    borderRadius: radius.lg,
    maxWidth: '86%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  perReply: { lineHeight: 16, paddingHorizontal: 4 },
  typing: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  notice: { textAlign: 'center' },
  inputRow: {
    alignItems: 'flex-end',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    color: colors.text,
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sendDisabled: { opacity: 0.4 },
});
