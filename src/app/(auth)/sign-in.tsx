import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { signInWithPassword, signUpWithPassword } from '@/features/auth/api';
import { AppText, Button, Card, Screen, TextField, colors, radius, spacing } from '@/shared/ui';
import { toUserMessage } from '@/shared/utils/error-message';

type Mode = 'sign-in' | 'sign-up';

/**
 * 评委演示账号（只在 Web 端出现入口）。
 *
 * 为什么需要它：Supabase 项目开着「邮箱确认」，评委现场注册收不到邮件就进不来，
 * 演示会直接断在登录页。这个账号在 Supabase 后台预先创建并「Auto Confirm」，
 * 点一下就能进到药箱主界面。
 *
 * 取舍说明：密码写在前端 bundle 里等于公开。这里接受这个风险，因为它是一个
 * 只读演示账号 —— 不要往它里面放任何真实药品数据，数据被改就重新建库或清空。
 */
const DEMO_ACCOUNT = { email: 'demo@medicinebox.app', password: 'MedicineBox2026' };

const signInSchema = z.object({
  email: z.string().trim().min(1, '请填写邮箱').email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 位'),
});

const signUpSchema = signInSchema.extend({
  displayName: z.string().trim().min(1, '请填写昵称').max(20, '昵称最多 20 个字'),
});

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === 'sign-up';

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit() {
    setError(null);
    setNotice(null);

    if (isSignUp) {
      const parsed = signUpSchema.safeParse({ email, password, displayName });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? '请检查输入');
        return;
      }
      setSubmitting(true);
      try {
        const session = await signUpWithPassword(
          parsed.data.email,
          parsed.data.password,
          parsed.data.displayName,
        );
        if (!session) {
          setNotice('注册成功。请去邮箱点确认链接，然后回来点「登录」。');
          setMode('sign-in');
        }
      } catch (cause) {
        setError(toUserMessage(cause));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '请检查输入');
      return;
    }
    setSubmitting(true);
    try {
      // 登录成功后 AuthProvider 会收到会话，(auth) 布局自动跳转到药箱首页
      await signInWithPassword(parsed.data.email, parsed.data.password);
    } catch (cause) {
      setError(toUserMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemo() {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await signInWithPassword(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
    } catch {
      setError('演示账号还没初始化，请先用邮箱注册，或联系作者开通演示账号。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <AppText variant="hero">家庭药箱</AppText>
        <AppText variant="caption">和家人共享一个药箱，过期与服药一目了然</AppText>
      </View>

      <View style={styles.switcher}>
        <Pressable
          accessibilityRole="button"
          onPress={() => switchMode('sign-in')}
          style={[styles.switchItem, mode === 'sign-in' ? styles.switchActive : null]}
        >
          <AppText variant="bodyStrong" color={mode === 'sign-in' ? colors.onPrimary : colors.textMuted}>
            登录
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => switchMode('sign-up')}
          style={[styles.switchItem, mode === 'sign-up' ? styles.switchActive : null]}
        >
          <AppText variant="bodyStrong" color={mode === 'sign-up' ? colors.onPrimary : colors.textMuted}>
            注册
          </AppText>
        </Pressable>
      </View>

      <Card style={styles.form}>
        {isSignUp ? (
          <TextField
            autoCorrect={false}
            label="昵称"
            maxLength={20}
            onChangeText={setDisplayName}
            placeholder="家人看到的名字，比如「小明」"
            value={displayName}
          />
        ) : null}

        <TextField
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          label="邮箱"
          onChangeText={setEmail}
          placeholder="you@example.com"
          value={email}
        />

        <TextField
          label="密码"
          onChangeText={setPassword}
          placeholder="至少 6 位"
          secureTextEntry
          value={password}
        />

        {error ? (
          <AppText color={colors.dangerText} variant="caption">
            {error}
          </AppText>
        ) : null}

        {notice ? (
          <AppText color={colors.success} variant="caption">
            {notice}
          </AppText>
        ) : null}

        <Button
          disabled={submitting}
          label={submitting ? '请稍候…' : isSignUp ? '注册并登录' : '登录'}
          onPress={handleSubmit}
        />
      </Card>

      {Platform.OS === 'web' ? (
        <Pressable disabled={submitting} onPress={handleDemo} style={styles.demo}>
          <AppText variant="bodyStrong" color={colors.primary}>
            评委演示：一键进入示例药箱
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            无需注册，直接查看药品、有效期预警与「任阳」问答
          </AppText>
        </Pressable>
      ) : null}

      <AppText variant="caption" style={styles.footer}>
        第一次使用请先点上面的「注册」。账号只用来同步你和家人的药箱，不会公开。
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, justifyContent: 'center' },
  header: { gap: spacing.sm },
  switcher: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: 'row',
    padding: 4,
  },
  switchItem: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  switchActive: { backgroundColor: colors.primary },
  form: { gap: spacing.md },
  footer: { textAlign: 'center' },
  demo: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
    padding: spacing.md,
  },
});
