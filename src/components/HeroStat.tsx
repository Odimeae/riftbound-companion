import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { WlPill } from './WlPill';
import { MatchOutcome } from '../types/match';

/** Detail/list hero strip: WlPill + matchup title + quiet meta */
export function HeroStat({
  outcome,
  title,
  meta,
}: {
  outcome: MatchOutcome;
  title: string;
  meta?: string;
}) {
  return (
    <View style={styles.wrap}>
      <WlPill outcome={outcome} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  meta: {
    color: colors.textSecondary,
    ...typography.meta,
  },
});
