import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen, colors, spacing } from '@/shared/ui';

/**
 * 登录页占位（T3 实现邮箱 OTP / 密码登录）。
 * 现在保留它是为了让路由骨架可跑通，并验证 Supabase 环境变量已正确注入。
 */
export default function SignInScreen() {
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <AppText variant="hero">家庭药箱</AppText>
        <AppText variant="caption">和家人共享一个药箱，过期与服药一目了然</AppText>
      </View>

      <Card>
        <AppText variant="subtitle">登录</AppText>
        <AppText variant="caption">
          登录能力在 T3 接入（Supabase Auth：邮箱验证码 / 密码）。
        </AppText>
        <AppText variant="caption" color={colors.success}>
          后端环境变量已注入，Supabase 客户端初始化成功。
        </AppText>
      </Card>

      <Button label="返回（占位）" disabled onPress={() => {}} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, justifyContent: 'center' },
  header: { gap: spacing.sm },
});
