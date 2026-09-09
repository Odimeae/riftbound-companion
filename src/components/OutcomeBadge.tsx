import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MatchOutcome, outcomeShort } from '../types/match';
import { colors } from '../theme/colors';

/** Soft W/L pill — min 28×28, radius 8; `lg` for DetailHero */
export function OutcomeBadge({
  outcome,
  size = 'md',
}: {
  outcome: MatchOutcome;
  size?: 'sm' | 'md' | 'lg';
}) {
  const win = outcome === 'Win';
  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        size === 'lg' && styles.badgeLg,
        { backgroundColor: win ? colors.winBg : colors.lossBg },
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'sm' && styles.textSm,
          size === 'lg' && styles.textLg,
          { color: win ? colors.win : colors.loss },
        ]}
      >
        {outcomeShort(outcome)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 28,
    minHeight: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    minWidth: 28,
    minHeight: 28,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  badgeLg: {
    minWidth: 40,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
  textSm: {
    fontSize: 12,
  },
  textLg: {
    fontSize: 18,
    fontWeight: '800',
  },
});
