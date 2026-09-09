import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SideboardSwap } from '../types/sideboard';
import { colors } from '../theme/colors';

export type DiffKind = 'kept' | 'changed' | 'missing' | 'extra';

const KIND_META: Record<
  DiffKind,
  { color: string; bg: string; label: string }
> = {
  kept: { color: colors.win, bg: colors.winBg, label: 'Kept' },
  changed: { color: colors.warning, bg: colors.warningBg, label: 'Changed' },
  missing: { color: colors.loss, bg: colors.lossBg, label: 'Missing' },
  extra: {
    color: colors.inactive,
    bg: 'rgba(144, 147, 164, 0.14)',
    label: 'Extra',
  },
};

function SwapLine({
  swap,
  prefix,
}: {
  swap: SideboardSwap;
  prefix?: string;
}) {
  return (
    <View style={styles.swapLine}>
      {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
      <Text style={styles.out} numberOfLines={2}>
        <Text style={styles.colTag}>OUT </Text>
        {swap.outCard}
      </Text>
      <Ionicons
        name="arrow-forward"
        size={14}
        color={colors.inactive}
        style={styles.arrow}
      />
      <Text style={styles.in} numberOfLines={2}>
        <Text style={styles.colTag}>IN </Text>
        {swap.inCard}
      </Text>
    </View>
  );
}

/**
 * Plan-vs-actual swap row —
 * Kept (win soft) / Changed (warn soft) / Missing (loss soft) / Extra (muted soft).
 * Changed shows plan + actual lines.
 */
export function DiffRow({
  swap,
  kind,
  actualSwap,
}: {
  swap: SideboardSwap;
  kind: DiffKind;
  /** Required visually for `changed` — plan on first line, actual on second. */
  actualSwap?: SideboardSwap;
}) {
  const meta = KIND_META[kind];
  return (
    <View
      style={[
        styles.row,
        { borderLeftColor: meta.color, backgroundColor: meta.bg },
      ]}
    >
      <Text style={[styles.kind, { color: meta.color }]}>{meta.label}</Text>
      <View style={styles.body}>
        {kind === 'changed' && actualSwap ? (
          <>
            <SwapLine swap={swap} prefix="Plan" />
            <SwapLine swap={actualSwap} prefix="Actual" />
          </>
        ) : (
          <SwapLine swap={swap} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    borderLeftWidth: 3,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  kind: {
    fontSize: 11,
    fontWeight: '800',
    width: 62,
    letterSpacing: 0.2,
    paddingTop: 2,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  swapLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  prefix: {
    color: colors.inactive,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    width: 44,
  },
  out: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    minWidth: 72,
  },
  in: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    minWidth: 72,
  },
  colTag: {
    color: colors.inactive,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  arrow: {
    marginHorizontal: 2,
  },
});
