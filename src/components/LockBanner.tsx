import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

/**
 * Table-obvious warn callout — warn left bar, short meta.
 * Use in Match log / detail / Compare for Bo3 Game 1 lock notes.
 * `WarnBanner` is the same component (design-system alias).
 */
export function LockBanner({
  title = 'G1 locked',
  meta = 'Changes after game 1',
}: {
  title?: string;
  meta?: string | null;
}) {
  return (
    <View style={styles.banner} accessibilityRole="text">
      <Text style={styles.title}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

/** Design-system alias — same warn soft banner as LockBanner. */
export const WarnBanner = LockBanner;

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.inset,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  meta: {
    color: colors.textSecondary,
    ...typography.meta,
    lineHeight: 18,
  },
});
