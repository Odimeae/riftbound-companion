import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MatchOutcome } from '../types/match';
import { WlPill } from './WlPill';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

/**
 * Flat Bo3 game row — G1/G2/G3 + WlPill or em dash when not logged. minH 52.
 */
export function GameRow({
  label,
  outcome,
  last,
}: {
  label: string;
  outcome?: MatchOutcome | null;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.label}>{label}</Text>
      {outcome ? (
        <WlPill outcome={outcome} size="sm" />
      ) : (
        <Text style={styles.dash}>—</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: spacing.rowMinH,
    paddingHorizontal: 4,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  dash: {
    color: colors.inactive,
    ...typography.title,
    paddingHorizontal: 10,
  },
});
