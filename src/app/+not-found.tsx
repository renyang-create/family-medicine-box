import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, colors } from '@/shared/ui';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <AppText variant="title">页面不存在</AppText>
      <Link href="/" style={styles.link}>
        <AppText color={colors.primary}>返回首页</AppText>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: 12, justifyContent: 'center' },
  link: { padding: 12 },
});
