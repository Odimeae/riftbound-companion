import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

function swapsLabel(n: number): string {
  return `${n} swap${n === 1 ? '' : 's'}`;
}

/**
 * Compare header strip — Plan `{n} swaps` | Actual `{n}` or `Not logged`.
 * When actual missing, accent `Log match` CTA; caller hides/disables diff.
 */
export function CompareSummary({
  planCount,
  actualCount,
  hasActual,
  onLogMatch,
}: {
  planCount: number;
  actualCount: number;
  hasActual: boolean;
  onLogMatch?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.cols}>
        <View style={styles.col}>
          <Text style={styles.colLabel}>Plan</Text>
          <Text style={styles.colValue}>{swapsLabel(planCount)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.col}>
          <Text style={styles.colLabel}>Actual</Text>
          <Text style={styles.colValue}>
            {hasActual ? swapsLabel(actualCount) : 'Not logged'}
          </Text>
        </View>
      </View>
      {!hasActual && onLogMatch ? (
        <Pressable
          onPress={onLogMatch}
          style={styles.logCta}
          accessibilityRole="button"
          accessibilityLabel="Log match"
        >
          <Text style={styles.logCtaText}>Log match</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 14,
    gap: 12,
  },
  cols: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  col: {
    flex: 1,
    gap: 4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginHorizontal: 14,
  },
  colLabel: {
    color: colors.inactive,
    ...typography.label,
  },
  colValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  logCta: {
    minHeight: spacing.hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  logCtaText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
});
