import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useMatches } from '../../src/context/MatchContext';
import { EmptyState } from '../../src/components/EmptyState';
import { IconButton } from '../../src/components/IconButton';
import { MatchRow } from '../../src/components/MatchRow';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { colors } from '../../src/theme/colors';
import { elevation } from '../../src/theme/elevation';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import {
  formatPercent,
  winLossLabel,
  winRate,
  winRateByDeck,
  winRateByOpponentLegend,
  winRateBySideboardUsage,
} from '../../src/utils/stats';
import { deckLookupKey } from '../../src/utils/deckName';

export default function HomeScreen() {
  const { matches, loading } = useMatches();
  const router = useRouter();
  const navigation = useNavigation();
  const [deckFilter, setDeckFilter] = useState<string | null>(null);

  const overall = useMemo(() => winRate(matches), [matches]);
  const byDeck = useMemo(() => winRateByDeck(matches), [matches]);
  const byOppLegend = useMemo(
    () => winRateByOpponentLegend(matches),
    [matches],
  );
  const bySideboard = useMemo(
    () => winRateBySideboardUsage(matches),
    [matches],
  );
  const recent = useMemo(() => {
    const source = deckFilter
      ? matches.filter(
          (m) =>
            deckLookupKey(m.ownDeck || 'Unnamed Deck') ===
            deckLookupKey(deckFilter),
        )
      : matches;
    return source.slice(0, 8);
  }, [matches, deckFilter]);

  // In-content header only — no Expo gear in native header
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerRight: () => null, headerTitle: '' });
    }, [navigation]),
  );

  const openSettings = () =>
    Alert.alert(
      'Settings',
      'Local-only app — matches and sideboards stay on this device. No account or cloud sync.',
    );

  const toggleDeck = (deck: string) =>
    setDeckFilter((prev) => (prev === deck ? null : deck));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const empty = matches.length === 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. Header — Home + WR pill + quiet settings */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Home</Text>
            {overall != null ? (
              <View style={styles.wrPill}>
                <Text style={styles.wrPct}>{formatPercent(overall)}</Text>
                <Text style={styles.wrRecord}>{winLossLabel(matches)}</Text>
              </View>
            ) : null}
          </View>
          <IconButton
            name="settings-outline"
            accessibilityLabel="Settings"
            color={colors.inactive}
            onPress={openSettings}
          />
        </View>

        {empty ? (
          <EmptyState
            title="No matches yet"
            message="Log your first match to build a feed of recent results and deck win rates."
            icon="game-controller-outline"
          />
        ) : (
          <>
            {/* 2. By deck — horizontal e1 chips */}
            <View style={styles.block}>
              <Text style={styles.sectionLabel}>By deck</Text>
              {byDeck.length === 0 ? (
                <Text style={styles.emptyHint}>
                  Deck stats appear after you log matches.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {byDeck.map((row) => {
                    const active = deckFilter === row.deck;
                    return (
                      <Pressable
                        key={row.deck}
                        onPress={() => toggleDeck(row.deck)}
                        style={({ pressed }) => [
                          styles.deckChip,
                          elevation.e1,
                          active && styles.deckChipActive,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={styles.deckChipName} numberOfLines={1}>
                          {row.deck}
                        </Text>
                        <Text style={styles.deckChipPct}>
                          {formatPercent(row.rate)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* 2b. By opponent legend */}
            <View style={styles.block}>
              <Text style={styles.sectionLabel}>By opponent legend</Text>
              {byOppLegend.length === 0 ? (
                <Text style={styles.emptyHint}>
                  Opponent legend stats appear after you log matches.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {byOppLegend.map((row) => (
                    <View
                      key={row.label}
                      style={[styles.deckChip, elevation.e1]}
                    >
                      <Text style={styles.deckChipName} numberOfLines={1}>
                        {row.label}
                      </Text>
                      <Text style={styles.deckChipPct}>
                        {formatPercent(row.rate)}
                      </Text>
                      <Text style={styles.deckChipCount}>{row.count}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* 2c. Sideboard used vs G1/Bo1 */}
            {(bySideboard.sideboardUsed || bySideboard.g1OnlyOrBo1) ? (
              <View style={styles.block}>
                <Text style={styles.sectionLabel}>Sideboard usage</Text>
                <View style={styles.sbUsageRow}>
                  {bySideboard.sideboardUsed ? (
                    <View style={[styles.deckChip, elevation.e1]}>
                      <Text style={styles.deckChipName} numberOfLines={1}>
                        {bySideboard.sideboardUsed.label}
                      </Text>
                      <Text style={styles.deckChipPct}>
                        {formatPercent(bySideboard.sideboardUsed.rate)}
                      </Text>
                      <Text style={styles.deckChipCount}>
                        {bySideboard.sideboardUsed.count}
                      </Text>
                    </View>
                  ) : null}
                  {bySideboard.g1OnlyOrBo1 ? (
                    <View style={[styles.deckChip, elevation.e1]}>
                      <Text style={styles.deckChipName} numberOfLines={1}>
                        {bySideboard.g1OnlyOrBo1.label}
                      </Text>
                      <Text style={styles.deckChipPct}>
                        {formatPercent(bySideboard.g1OnlyOrBo1.rate)}
                      </Text>
                      <Text style={styles.deckChipCount}>
                        {bySideboard.g1OnlyOrBo1.count}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* 3. Recent — primary feed (e0 flat MatchRows) */}
            <View style={styles.block}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>
                  {deckFilter ? `Recent · ${deckFilter}` : 'Recent'}
                </Text>
                <Pressable
                  onPress={() => router.push('/(tabs)/matches')}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              </View>

              {recent.length === 0 ? (
                <Text style={styles.emptyHint}>
                  No matches for this deck yet.
                </Text>
              ) : (
                <View>
                  {recent.map((match) => (
                    <MatchRow
                      key={match.id}
                      match={match}
                      variant="flat"
                      onPress={() => router.push(`/match/${match.id}`)}
                    />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Thumb-zone CTA — flush with screen, no bar */}
      <View style={styles.footer}>
        <PrimaryButton
          label="Log match"
          onPress={() => router.push('/match/log')}
          depth="e2"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPad,
    gap: spacing.blockGap,
    paddingBottom: 24,
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: spacing.screenPad,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: spacing.hitTarget,
    marginBottom: 4,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  /** WR pill — accentSoft fill + accent text, no heavy shadow */
  wrPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  wrPct: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  wrRecord: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  block: {
    gap: 8,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: colors.inactive,
    ...typography.label,
    flexShrink: 1,
  },
  seeAll: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyHint: {
    color: colors.textSecondary,
    ...typography.body,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingRight: 8,
  },
  deckChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    maxWidth: 220,
  },
  deckChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  deckChipName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  /** % as text — does not compete with accent CTA */
  deckChipPct: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  deckChipCount: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  sbUsageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pressed: {
    opacity: 0.85,
  },
});
