import { StyleSheet, View } from 'react-native';

import { buildExpiryLabel } from '@/shared/domain/expiry';
import { EXPIRY_COLORS } from '@/shared/constants/expiry';
import { AppText, radius, spacing } from '@/shared/ui';

type Props = {
  expireDate: string | null;
  /** 便于测试注入「今天」 */
  now?: Date;
};

/**
 * 有效期标签。
 * 硬要求：「已过期 N 天」/「N 天后过期」里的 N 必须单独标红、加粗、字号更大。
 * 因此 N 用独立的 AppText 节点，不与前后文字共用一个样式。
 */
export function ExpiryBadge({ expireDate, now }: Props) {
  const label = buildExpiryLabel(expireDate, now);
  if (!label) return null;

  const palette = EXPIRY_COLORS[label.status];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.background, borderColor: palette.border },
      ]}
    >
      {label.prefix ? (
        <AppText style={[styles.text, { color: palette.text }]} variant="caption">
          {label.prefix}
        </AppText>
      ) : null}
      <AppText style={[styles.number, { color: palette.number }]}>{label.days}</AppText>
      <AppText style={[styles.text, { color: palette.text }]} variant="caption">
        {label.suffix}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  text: { fontWeight: '500' },
  number: { fontSize: 16, fontWeight: '700' },
});
