import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from './theme';

type Props = PropsWithChildren<{
  /** 内容超出屏幕时使用滚动容器（默认 true） */
  scroll?: boolean;
  /** 是否加默认内边距（默认 true） */
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}>;

/** 页面容器：统一背景色 + 安全区 + 内边距，避免每个页面重复写 */
export function Screen({ children, scroll = true, padded = true, contentStyle }: Props) {
  const inner = [padded ? styles.padded : null, contentStyle];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, ...inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  padded: { padding: spacing.lg, gap: spacing.lg },
});
