import React, { useLayoutEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMatches } from '../../src/context/MatchContext';
import { useSideboard } from '../../src/context/SideboardContext';
import { DetailHero } from '../../src/components/DetailHero';
import { GameRow } from '../../src/components/GameRow';
import { EmptyState } from '../../src/components/EmptyState';
import { Chip } from '../../src/components/Chip';
import { SectionLabel } from '../../src/components/SectionLabel';
import { IconButton } from '../../src/components/IconButton';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import {
  displayTitle,
  MISTAKE_TAG_LABELS,
  noteOneLiner,
} from '../../src/types/match';
import { planTitle } from '../../src/types/sideboard';
import { formatMatchDate } from '../../src/utils/stats';

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getMatch, deleteMatch } = useMatches();
  const { getPlan } = useSideboard();
  const match = getMatch(id);
  const router = useRouter();
  const navigation = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);

  const truncatedTitle = match
    ? displayTitle(match).length > 22
      ? `${displayTitle(match).slice(0, 20)}…`
      : displayTitle(match)
    : 'Match';

  useLayoutEffect(() => {
    navigation.setOptions({
      title: truncatedTitle,
      headerBackTitle: 'Matches',
      headerRight: () =>
        match ? (
          <IconButton
            name="ellipsis-horizontal"
            accessibilityLabel="Match actions"
            onPress={() => setMenuOpen(true)}
          />
        ) : null,
    });
  }, [match, navigation, truncatedTitle]);

  if (!match) {
    return (
      <View style={styles.missing}>
        <EmptyState
          title="Match not found"
          message="This match may have been deleted."
          icon="alert-circle-outline"
          ctaLabel="Back to Matches"
          onPress={() => router.replace('/(tabs)/matches')}
        />
      </View>
    );
  }

  const onDelete = () => {
    setMenuOpen(false);
    Alert.alert(
      'Delete match?',
      'This permanently removes the match and its notes from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMatch(match.id);
            router.replace('/(tabs)/matches');
          },
        },
      ],
    );
  };

  const boardedGames = match.games
    .slice()
    .sort((a, b) => a.gameNumber - b.gameNumber);

  const gameByNumber = (n: number) =>
    boardedGames.find((g) => g.gameNumber === n);

  // Sideboard rows for G2/G3 when plan and/or actual exist
  const sideboardRows = boardedGames
    .filter((g) => g.gameNumber >= 2)
    .map((g) => {
      const sb = g.sideboard;
      if (!sb) return null;
      const plan = sb.fromPlanId ? getPlan(sb.fromPlanId) : undefined;
      const hasPlan = Boolean(sb.fromPlanId);
      const hasActual = (sb.actualSwaps?.length ?? 0) > 0;
      if (!hasPlan && !hasActual && sb.planFollowed === 'no_plan') return null;
      return { game: g, plan, hasPlan, hasActual, sb };
    })
    .filter(Boolean) as {
    game: (typeof boardedGames)[number];
    plan: ReturnType<typeof getPlan>;
    hasPlan: boolean;
    hasActual: boolean;
    sb: NonNullable<(typeof boardedGames)[number]['sideboard']>;
  }[];

  const metaLine = `${formatMatchDate(match.date)} · ${match.eventType} · ${match.format}`;
  // Champions = legends only — never note text (fixes “Miracle · Test” note leak)
  const champions = [match.ownLegend, match.opponentLegend]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(' · ');

  const openSideboardRow = (row: (typeof sideboardRows)[number]) => {
    if (row.hasPlan && row.hasActual) {
      router.push({
        pathname: '/match/compare',
        params: {
          matchId: match.id,
          gameNumber: String(row.game.gameNumber),
          planId: row.sb.fromPlanId,
        },
      });
      return;
    }
    if (row.hasPlan && row.sb.fromPlanId) {
      router.push({
        pathname: '/sideboard/plan',
        params: { id: row.sb.fromPlanId },
      });
      return;
    }
    // Actual only → Compare (shows Not logged plan / actuals)
    router.push({
      pathname: '/match/compare',
      params: {
        matchId: match.id,
        gameNumber: String(row.game.gameNumber),
      },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: truncatedTitle,
          headerBackTitle: 'Matches',
        }}
      />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DetailHero
          outcome={match.outcome}
          title={displayTitle(match)}
          meta={metaLine}
          champions={champions || undefined}
        />

        {match.format === 'Bo3' ? (
          <View style={styles.block}>
            <SectionLabel>Games</SectionLabel>
            <View style={styles.gamesCard}>
              {([1, 2, 3] as const).map((n, idx) => {
                const g = gameByNumber(n);
                return (
                  <GameRow
                    key={`g${n}`}
                    label={`G${n}`}
                    outcome={g?.outcome}
                    last={idx === 2}
                  />
                );
              })}
            </View>
          </View>
        ) : null}

        {match.format === 'Bo1' ? (
          <View style={styles.block}>
            <SectionLabel>Sideboard</SectionLabel>
            <Text style={styles.bo1SbHint}>Bo1 — no sideboard</Text>
          </View>
        ) : sideboardRows.length > 0 ? (
          <View style={styles.block}>
            <SectionLabel>Sideboard</SectionLabel>
            <View style={styles.sbList}>
              {sideboardRows.map((row, index) => {
                const meta =
                  row.hasPlan && row.hasActual
                    ? 'Plan vs actual'
                    : row.hasPlan
                      ? 'Plan'
                      : 'Actual';
                const subtitle = row.plan
                  ? planTitle(row.plan)
                  : `Game ${row.game.gameNumber}`;
                return (
                  <Pressable
                    key={`sb-${row.game.id}`}
                    style={[
                      styles.sbRow,
                      index > 0 && styles.sbRowDivider,
                    ]}
                    onPress={() => openSideboardRow(row)}
                    accessibilityRole="button"
                    accessibilityLabel={`${subtitle}, ${meta}`}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.sbTitle}>
                        G{row.game.gameNumber} · {subtitle}
                      </Text>
                      <Text style={styles.sbMeta}>{meta}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.inactive}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.block}>
          <SectionLabel>Notes</SectionLabel>
          {!noteOneLiner(match.note) ? (
            <Text style={styles.subtle}>No notes</Text>
          ) : (
            <View style={styles.notesInset}>
              <NoteBlock label="Note" value={noteOneLiner(match.note)} />
            </View>
          )}
        </View>

        {match.note.mistakeTags.length > 0 ? (
          <View style={styles.block}>
            <SectionLabel>Mistakes</SectionLabel>
            <View style={styles.tags}>
              {match.note.mistakeTags.map((tag) => (
                <Chip key={tag} label={MISTAKE_TAG_LABELS[tag]} />
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ height: 28 }} />
      </ScrollView>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuSheet}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push({
                  pathname: '/match/log',
                  params: { id: match.id },
                });
              }}
            >
              <Text style={styles.menuItemText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={onDelete}>
              <Text style={[styles.menuItemText, styles.menuDanger]}>
                Delete
              </Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => setMenuOpen(false)}
            >
              <Text style={[styles.menuItemText, { color: colors.inactive }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function NoteBlock({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <View>
      <Text style={styles.noteLabel}>{label}</Text>
      <Text style={styles.noteValue}>{value}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.screenPad,
    gap: spacing.blockGap,
    paddingBottom: 40,
  },
  missing: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.screenPad,
    justifyContent: 'center',
  },
  block: {
    gap: 8,
  },
  subtle: {
    color: colors.textSecondary,
    ...typography.meta,
    lineHeight: 20,
  },
  bo1SbHint: {
    color: colors.textMuted,
    ...typography.meta,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  gamesCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 10,
  },
  sbList: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  sbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: spacing.rowMinH,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  sbRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  sbTitle: {
    color: colors.text,
    ...typography.title,
  },
  sbMeta: {
    color: colors.textSecondary,
    ...typography.meta,
    fontWeight: '600',
  },
  notesInset: {
    backgroundColor: colors.inset,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  noteLabel: {
    color: colors.inactive,
    ...typography.label,
    marginBottom: 4,
  },
  noteValue: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: colors.hairline,
  },
  menuItem: {
    minHeight: 52,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  menuItemText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  menuDanger: {
    color: colors.loss,
  },
});
