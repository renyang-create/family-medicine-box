import { StyleSheet, Text } from 'react-native';
import type { TextProps } from 'react-native';

import { colors, fontSize } from './theme';

export type TextVariant = 'hero' | 'title' | 'subtitle' | 'body' | 'bodyStrong' | 'caption';

type Props = TextProps & {
  variant?: TextVariant;
  color?: string;
};

export function AppText({ variant = 'body', color, style, ...rest }: Props) {
  return <Text {...rest} style={[styles.base, variantStyles[variant], color ? { color } : null, style]} />;
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    fontSize: fontSize.body,
  },
});

const variantStyles = StyleSheet.create({
  hero: { fontSize: fontSize.hero, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: fontSize.title, fontWeight: '700' },
  subtitle: { fontSize: fontSize.subtitle, fontWeight: '600' },
  body: { fontSize: fontSize.body, fontWeight: '400' },
  bodyStrong: { fontSize: fontSize.body, fontWeight: '600' },
  caption: { fontSize: fontSize.caption, fontWeight: '400', color: colors.textMuted },
});
