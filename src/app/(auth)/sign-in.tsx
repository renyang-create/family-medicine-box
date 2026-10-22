import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { signInWithPassword, signUpWithPassword } from '@/features/auth/api';
import { AppText, Button, Card, Screen, TextField, colors, radius, spacing } from '@/shared/ui';
import { toUserMessage } from '@/shared/utils/error-message';

type Mode = 'sign-in' | 'sign-up';

/**
 * 示例账号（Web 演示构建专用）。
 *
 * 为什么需要它：项目开着「邮箱确认」，第一次打开的人注册后收不到邮件就停在登录页，
 * 看不到产品。示例账号在后台预先创建并 Auto Confirm，点一下就能进主界面。
 *
 * 边界（重要）：
 * 1. 入口只在 Web 出现，原生 App 永远没有 —— 产品里不出现任何演示/赛事物料；
 * 2. 正式 Web 版可用 EXPO_PUBLIC_DEMO_ENTRY=0 关掉；
 * 3. 账号里只能放示例数据，被改乱直接清空重建。
 *
 * 取舍：密码会进前端 bundle，等于公开。这是「体验模式」的常规代价，
 * 接受它的前提是里面没有任何真实数据。
 */
const DEMO_ACCOUNT = { email: 'demo@medicinebox.app', password: 'MedicineBox2026' };

/** 示例入口是否出现：仅 Web，且允许用 EXPO_PUBLIC_DEMO_ENTRY=0 关闭 */
const SHOW_DEMO_ENTRY = Platform.OS === 'web' && process.env.EXPO_PUBLIC_DEMO_ENTRY !== '0';

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
      setError('示例账号暂不可用，请用邮箱注册后登录。');
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

      {SHOW_DEMO_ENTRY ? (
        <Pressable disabled={submitting} onPress={handleDemo} style={styles.demo}>
          <AppText variant="bodyStrong" color={colors.primary}>
            免注册体验
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            进入示例药箱，内置常见药品、临期提醒与 AI 问答
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
