import { Pressable, StyleSheet, View } from 'react-native';

import { EXPIRY_COLORS } from '@/shared/constants/expiry';
import { getExpiryStatus } from '@/shared/domain/expiry';
import { AppText, colors, radius, spacing } from '@/shared/ui';
import { formatLocalDateTime } from '@/shared/utils/datetime';
import { formatQuantity } from '@/shared/utils/number';

import { ExpiryBadge } from './expiry-badge';
import type { Medicine } from './types';

type Props = {
  medicine: Medicine;
  onPress: () => void;
};

/**
 * 药品列表行。
 * 「红得醒目」的实现：过期行 = 左侧 6px 红条 + 淡红底 + 红色标签（数字红色加粗）。
 */
export function MedicineRow({ medicine, onPress }: Props) {
  const status = getExpiryStatus(medicine.expireDate);
  const palette = EXPIRY_COLORS[status];
  const isExpired = status === 'expired';
  const barWidth = status === 'expired' ? 6 : status === 'near_expiry' ? 4 : 0;

  const meta = [medicine.spec, `剩余 ${formatQuantity(medicine.quantity)}${medicine.unit ?? ''}`]
    .filter((part) => Boolean(part && String(part).trim().length > 0))
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isExpired ? { backgroundColor: EXPIRY_COLORS.expired.background } : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.bar, { backgroundColor: palette.border, width: barWidth }]} />

      <View style={styles.body}>
        <View style={styles.top}>
          <AppText numberOfLines={1} style={styles.name} variant="bodyStrong">
            {medicine.name}
          </AppText>
          <ExpiryBadge expireDate={medicine.expireDate} />
        </View>

        {meta ? <AppText variant="caption">{meta}</AppText> : null}

        <AppText color={colors.textSubtle} variant="caption">
          {medicine.lastTakenAt
            ? `上次服药 ${formatLocalDateTime(medicine.lastTakenAt)}`
            : '还没有服药记录'}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  bar: { alignSelf: 'stretch' },
  body: { flex: 1, gap: 2, padding: spacing.lg },
  top: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  name: { flex: 1 },
});
