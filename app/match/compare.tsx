import React, { useLayoutEffect, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMatches } from '../../src/context/MatchContext';
import { useSideboard } from '../../src/context/SideboardContext';
import { CompareSummary } from '../../src/components/CompareSummary';
import { DiffRow } from '../../src/components/DiffRow';
import { WarnBanner } from '../../src/components/LockBanner';
import { EmptyState } from '../../src/components/EmptyState';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { SectionLabel } from '../../src/components/SectionLabel';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { normalizeSwaps, planTitle } from '../../src/types/sideboard';
import {
  DiffBucket,
  DiffEntry,
  diffSessionAgainstPlan,
} from '../../src/utils/sideboardDiff';
import { normalizeDeckName } from '../../src/utils/deckName';
import { planMatchupMismatchMessage } from '../../src/utils/matchup';

const BUCKET_ORDER: DiffBucket[] = ['kept', 'changed', 'missing', 'extra'];

/**
 * Plan vs actual Compare screen.
 * Open via: `/match/compare?matchId=…&gameNumber=2` (gameNumber optional).
 */
export default function CompareScreen() {
  const params = useLocalSearchParams<{
    matchId?: string;
    id?: string;
    gameNumber?: string;
    planId?: string;
  }>();
  const matchId = (params.matchId || params.id || '').toString();
  const gameNumberParam = params.gameNumber
    ? Number(params.gameNumber)
    : undefined;
  const planIdParam = params.planId?.toString();

  const { getMatch } = useMatches();
  const { getPlan } = useSideboard();
  const match = getMatch(matchId);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const target = useMemo(() => {
    if (!match) return null;
    const games = match.games
      .slice()
      .sort((a, b) => a.gameNumber - b.gameNumber)
      .filter((g) => g.gameNumber >= 2);

    if (gameNumberParam && !Number.isNaN(gameNumberParam)) {
      const g = match.games.find((x) => x.gameNumber === gameNumberParam);
      if (g) return g;
    }

    if (planIdParam) {
      const g = games.find((x) => x.sideboard?.fromPlanId === planIdParam);
      if (g) return g;
    }

    const withBoth = games.find(
      (g) =>
        g.sideboard?.fromPlanId &&
        (g.sideboard.actualSwaps?.length ?? 0) > 0,
    );
    if (withBoth) return withBoth;

    const withAny = games.find(
      (g) =>
        g.sideboard &&
        (g.sideboard.fromPlanId ||
          (g.sideboard.actualSwaps?.length ?? 0) > 0),
    );
    return withAny ?? games[0] ?? null;
  }, [match, gameNumberParam, planIdParam]);

  const planId = target?.sideboard?.fromPlanId ?? planIdParam;
  const plan = planId ? getPlan(planId) : undefined;
  const planned = plan?.swaps ?? [];
  const actual = target?.sideboard?.actualSwaps ?? [];
  /** Spec: Actual `{n}` or `Not logged` — based on logged actual swaps. */
  const actualIsLogged = normalizeSwaps(actual).length > 0;

  const diff = diffSessionAgainstPlan(planned, actual, {
    fromPlanId: planId,
    planFollowed: target?.sideboard?.planFollowed,
  });

  const mismatch = plan && match ? planMatchupMismatchMessage(plan, match) : null;

  const subtitle = match
    ? `vs ${normalizeDeckName(match.opponentLegend) || normalizeDeckName(match.opponentDeck) || 'Unknown'} · ${normalizeDeckName(match.ownDeck) || 'Unknown'}`
    : undefined;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Compare',
      headerBackTitle: 'Back',
      headerRight: () => null,
    });
  }, [navigation]);

  if (!match) {
    return (
      <View style={styles.missing}>
        <EmptyState
          title="Match not found"
          message="Open Compare from a match or sideboard plan."
          icon="git-compare-outline"
          ctaLabel="Back"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  const openPlan = () => {
    if (planId) {
      router.push({
        pathname: '/sideboard/plan',
        params: { id: planId },
      });
    } else {
      router.push({
        pathname: '/sideboard/plan',
        params: { deckName: match.ownDeck },
      });
    }
  };

  const browsePlans = () => {
    router.push('/(tabs)/sideboard');
  };

  const openLog = () => {
    router.push({
      pathname: '/match/log',
      params: { id: match.id },
    });
  };

  const showEmpty =
    actualIsLogged &&
    (diff.entries.length === 0 ||
      (normalizeSwaps(planned).length === 0 &&
        normalizeSwaps(actual).length === 0));

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Compare',
          headerBackTitle: 'Back',
          headerRight: () => null,
        }}
      />
      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 24 + spacing.hitTarget * 2 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}

          {match.format === 'Bo3' ? (
            <WarnBanner title="G1 locked" meta="Changes after game 1" />
          ) : null}

          {mismatch ? (
            <WarnBanner title={mismatch} meta={null} />
          ) : null}

          <CompareSummary
            planCount={normalizeSwaps(planned).length}
            actualCount={normalizeSwaps(actual).length}
            hasActual={actualIsLogged}
            onLogMatch={openLog}
          />

          {plan ? (
            <Pressable
              onPress={openPlan}
              style={styles.planMeta}
              accessibilityRole="button"
            >
              <Text style={styles.planMetaLabel}>Plan</Text>
              <Text style={styles.planMetaTitle}>{planTitle(plan)}</Text>
              {mismatch ? (
                <Text style={styles.planMetaWarn}>Matchup does not match this match</Text>
              ) : null}
            </Pressable>
          ) : null}

          {!actualIsLogged ? (
            <Text style={styles.hint}>
              Diff is available after you log actual sideboard swaps for this
              match.
            </Text>
          ) : showEmpty ? (
            <EmptyState
              title="No sideboard changes"
              message={
                plan
                  ? 'Plan and actual have no swaps to compare.'
                  : 'No plan or swaps logged for this game.'
              }
              icon="git-compare-outline"
              ctaLabel="Edit plan"
              onPress={openPlan}
            />
          ) : (
            <View style={styles.diffBlock}>
              <SectionLabel>Diff</SectionLabel>
              <View style={styles.table}>
                {BUCKET_ORDER.map((bucket) => {
                  const entries = diff.entries.filter(
                    (e) => e.bucket === bucket,
                  );
                  if (entries.length === 0) return null;
                  return (
                    <View key={bucket}>
                      {entries.map((entry, idx) => (
                        <DiffEntryRow
                          key={`${bucket}-${idx}`}
                          entry={entry}
                        />
                      ))}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          {mismatch ? (
            <>
              <PrimaryButton label="Edit plan" onPress={openPlan} />
              <PrimaryButton
                label="Browse plans"
                onPress={browsePlans}
                variant="ghost"
              />
            </>
          ) : (
            <>
              <PrimaryButton
                label="Edit plan"
                onPress={openPlan}
                variant="ghost"
              />
              {!actualIsLogged ? (
                <PrimaryButton label="Log match" onPress={openLog} />
              ) : null}
            </>
          )}
        </View>
      </View>
    </>
  );
}

function DiffEntryRow({ entry }: { entry: DiffEntry }) {
  return (
    <DiffRow
      swap={entry.swap}
      kind={entry.bucket}
      actualSwap={entry.actualSwap}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    padding: spacing.screenPad,
    gap: spacing.blockGap,
  },
  missing: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.screenPad,
    justifyContent: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    ...typography.meta,
    fontWeight: '600',
  },
  planMeta: {
    gap: 2,
    paddingVertical: 4,
  },
  planMetaLabel: {
    color: colors.inactive,
    ...typography.label,
  },
  planMetaTitle: {
    color: colors.text,
    ...typography.title,
  },
  planMetaWarn: {
    color: colors.warning,
    ...typography.meta,
    fontWeight: '600',
    marginTop: 4,
  },
  hint: {
    color: colors.textSecondary,
    ...typography.meta,
    lineHeight: 20,
  },
  diffBlock: {
    gap: 8,
  },
  table: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenPad,
    paddingTop: 12,
    gap: 8,
  },
});
