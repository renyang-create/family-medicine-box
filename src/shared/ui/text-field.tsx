import { StyleSheet, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { AppText } from './app-text';
import { colors, radius, spacing } from './theme';

type Props = TextInputProps & {
  label: string;
  /** 校验错误：有值就显示红字并把边框标红 */
  error?: string | null;
  hint?: string;
};

export function TextField({ label, error, hint, style, ...rest }: Props) {
  const hasError = Boolean(error);

  return (
    <View style={styles.wrapper}>
      <AppText variant="caption">{label}</AppText>
      <TextInput
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, hasError ? styles.inputError : null, style]}
        {...rest}
      />
      {hasError ? (
        <AppText color={colors.dangerText} variant="caption">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  inputError: { borderColor: colors.danger },
});
