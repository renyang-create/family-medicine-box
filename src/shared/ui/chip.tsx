import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { colors, radius, spacing } from './theme';

type Props = {
  label: string;
  /** 选中态：蓝底白字 */
  selected?: boolean;
  onPress?: () => void;
  /** 传入后右侧出现「×」 */
  onRemove?: () => void;
  /** 列表里展示用的小号标签 */
  size?: 'md' | 'sm';
};

/**
 * 胶囊标签。
 * 有 onPress 时是可点按钮（筛选用），否则是静态展示（列表展示用）。
 */
export function Chip({ label, selected = false, onPress, onRemove, size = 'md' }: Props) {
  const content = (
    <View
      style={[
        styles.chip,
        size === 'sm' ? styles.chipSm : null,
        selected ? styles.chipSelected : null,
      ]}
    >
      <AppText
        color={selected ? colors.onPrimary : colors.textMuted}
        numberOfLines={1}
        variant="caption"
      >
        {label}
      </AppText>
      {onRemove ? (
        <AppText color={selected ? colors.onPrimary : colors.textSubtle} variant="caption">
          ×
        </AppText>
      ) : null}
    </View>
  );

  if (!onPress && !onRemove) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={4}
      onPress={onPress ?? onRemove}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 32,
    paddingHorizontal: spacing.md,
  },
  chipSm: { minHeight: 22, paddingHorizontal: spacing.sm },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.8 },
});
