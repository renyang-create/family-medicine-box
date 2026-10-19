import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { colors, spacing } from './theme';

type Props = {
  title: string;
  description?: string;
  /** 底部操作区（按钮等） */
  children?: ReactNode;
};

export function EmptyState({ title, description, children }: Props) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="bodyStrong" style={styles.title}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="caption" style={styles.description}>
          {description}
        </AppText>
      ) : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  title: { textAlign: 'center' },
  description: { textAlign: 'center' },
  actions: { gap: spacing.sm, marginTop: spacing.sm, width: '100%' },
});
