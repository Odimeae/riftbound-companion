import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { WlPill } from './WlPill';
import { MatchOutcome } from '../types/match';

/**
 * Match Detail hero — large WlPill + Win/Loss label, `{deck} vs {opp}`,
 * meta (date · event · format), champions line (legends only — never notes).
 */
export function DetailHero({
  outcome,
  title,
  meta,
  champions,
}: {
  outcome: MatchOutcome;
  title: string;
  meta?: string;
  /** Own / opponent legend line — omit when empty. */
  champions?: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.resultRow}>
        <WlPill outcome={outcome} size="lg" />
        <Text
          style={[
            styles.outcomeLabel,
            { color: outcome === 'Win' ? colors.win : colors.loss },
          ]}
        >
          {outcome === 'Win' ? 'Win' : 'Loss'}
        </Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {meta ? (
        <Text style={styles.meta} numberOfLines={2}>
          {meta}
        </Text>
      ) : null}
      {champions ? (
        <Text style={styles.champions} numberOfLines={1}>
          {champions}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    paddingVertical: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  outcomeLabel: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  meta: {
    color: colors.textSecondary,
    ...typography.meta,
  },
  champions: {
    color: colors.textMuted,
    ...typography.meta,
    fontWeight: '600',
  },
});
