import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { colors, radius, spacing } from './theme';

type Props = {
  title: string;
  subtitle?: string;
  /** 传入则显示返回箭头（通常是 router.back） */
  onBack?: () => void;
};

export function PageHeader({ title, subtitle, onBack }: Props) {
  return (
    <View style={styles.wrapper}>
      {onBack ? (
        <Pressable
          accessibilityLabel="返回"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={styles.back}
        >
          <Ionicons color={colors.text} name="chevron-back" size={22} />
        </Pressable>
      ) : null}
      <View style={styles.text}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  back: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  text: { flex: 1, gap: 2 },
});
