import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMatches } from '../../src/context/MatchContext';
import { useSideboard } from '../../src/context/SideboardContext';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { TagPicker } from '../../src/components/TagPicker';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { FieldLabel, SectionCard, TextField } from '../../src/components/Field';
import { SwapPairEditor } from '../../src/components/SwapPairEditor';
import { PlanFollowedChips } from '../../src/components/PlanFollowedChips';
import { PlanActualDiff } from '../../src/components/PlanActualDiff';
import { LockBanner } from '../../src/components/LockBanner';
import { SectionLabel } from '../../src/components/SectionLabel';
import { Chip } from '../../src/components/Chip';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import {
  EVENT_TYPES,
  EventType,
  GameResult,
  MATCH_FORMATS,
  MATCH_OUTCOMES,
  MatchFormat,
  MatchOutcome,
  MistakeTag,
  emptyNote,
  noteOneLiner,
} from '../../src/types/match';
import {
  PlanFollowed,
  SIDEBOARD_MAX,
  SideboardSession,
  SideboardSwap,
  emptySideboardSession,
  normalizeSwaps,
  planTitle,
} from '../../src/types/sideboard';
import { createId } from '../../src/utils/id';
import {
  formatMatchDate,
  knownOutCardsFromMatches,
  knownOwnDecks,
  recentOpponentLegends,
} from '../../src/utils/stats';
import { deckLookupKey, normalizeDeckName } from '../../src/utils/deckName';
import { planMatchesOpponent } from '../../src/utils/matchup';
import { isJunkCardName } from '../../src/components/SwapPairEditor';

type GameSbState = {
  fromPlanId?: string;
  actualSwaps: SideboardSwap[];
  planFollowed: PlanFollowed;
  enabled: boolean;
};

function sessionFromState(gameNumber: number, state: GameSbState): SideboardSession | undefined {
  if (gameNumber === 1) {
    return emptySideboardSession(false);
  }
  if (!state.enabled && state.actualSwaps.length === 0 && !state.fromPlanId) {
    return {
      ...emptySideboardSession(true),
      planFollowed: state.planFollowed,
    };
  }
  return {
    fromPlanId: state.fromPlanId,
    actualSwaps: normalizeSwaps(state.actualSwaps),
    planFollowed: state.planFollowed,
    sideboardingAllowed: true,
  };
}

function stateFromSession(session?: SideboardSession): GameSbState {
  if (!session) {
    return {
      actualSwaps: [],
      planFollowed: 'no_plan',
      enabled: false,
    };
  }
  return {
    fromPlanId: session.fromPlanId,
    actualSwaps: session.actualSwaps?.length ? session.actualSwaps : [],
    planFollowed: session.planFollowed ?? 'no_plan',
    enabled:
      Boolean(session.fromPlanId) ||
      (session.actualSwaps?.length ?? 0) > 0 ||
      session.planFollowed !== 'no_plan',
  };
}

export default function LogMatchScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { matches, getMatch, addMatch, updateMatch } = useMatches();
  const { plansForDeck, getPlan, getSideboardForDeck, sideboards } = useSideboard();
  const existing = id ? getMatch(id) : undefined;
  const isEdit = Boolean(existing);

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [eventType, setEventType] = useState<EventType>('Friendly');
  const [format, setFormat] = useState<MatchFormat>('Bo1');
  const [ownDeck, setOwnDeck] = useState('');
  const [ownDeckOther, setOwnDeckOther] = useState(false);
  const [ownLegend, setOwnLegend] = useState('');
  const [opponentDeck, setOpponentDeck] = useState('');
  const [opponentLegend, setOpponentLegend] = useState('');
  const [outcome, setOutcome] = useState<MatchOutcome>('Win');
  const [game1, setGame1] = useState<MatchOutcome>('Win');
  const [game2, setGame2] = useState<MatchOutcome>('Loss');
  const [game3Enabled, setGame3Enabled] = useState(false);
  const [game3, setGame3] = useState<MatchOutcome>('Win');
  const [gameIds, setGameIds] = useState<{ 1?: string; 2?: string; 3?: string }>({});
  const [sb2, setSb2] = useState<GameSbState>({
    actualSwaps: [],
    planFollowed: 'no_plan',
    enabled: false,
  });
  const [sb3, setSb3] = useState<GameSbState>({
    actualSwaps: [],
    planFollowed: 'no_plan',
    enabled: false,
  });
  const [oneLiner, setOneLiner] = useState('');
  const [mistakeTags, setMistakeTags] = useState<MistakeTag[]>([]);
  const [saving, setSaving] = useState(false);
  const [legendTouched, setLegendTouched] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);

  const recentLegends = useMemo(
    () => recentOpponentLegends(matches, 10),
    [matches],
  );
  const deckChips = useMemo(
    () => knownOwnDecks(matches, sideboards.map((s) => s.deckName)),
    [matches, sideboards],
  );

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Match' : 'Log Match' });
  }, [isEdit, navigation]);

  useEffect(() => {
    if (!existing) return;
    setDate(new Date(existing.date));
    setEventType(existing.eventType);
    setFormat(existing.format);
    setOwnDeck(existing.ownDeck);
    setOwnDeckOther(false);
    setOwnLegend(existing.ownLegend);
    setOpponentDeck(existing.opponentDeck);
    setOpponentLegend(existing.opponentLegend);
    setOutcome(existing.outcome);
    const g1 = existing.games.find((g) => g.gameNumber === 1);
    const g2 = existing.games.find((g) => g.gameNumber === 2);
    const g3 = existing.games.find((g) => g.gameNumber === 3);
    if (g1) setGame1(g1.outcome);
    if (g2) {
      setGame2(g2.outcome);
      setSb2(stateFromSession(g2.sideboard));
    }
    if (g3) {
      setGame3Enabled(true);
      setGame3(g3.outcome);
      setSb3(stateFromSession(g3.sideboard));
    }
    setGameIds({
      1: g1?.id,
      2: g2?.id,
      3: g3?.id,
    });
    setOneLiner(noteOneLiner(existing.note));
    setMistakeTags(existing.note.mistakeTags ?? []);
  }, [existing]);

  const deckPlans = useMemo(() => plansForDeck(ownDeck), [ownDeck, plansForDeck]);
  const sideboardCards = useMemo(
    () => getSideboardForDeck(ownDeck)?.cards ?? [],
    [ownDeck, getSideboardForDeck],
  );
  const filteredPlans = useMemo(() => {
    const matching = deckPlans.filter((plan) =>
      planMatchesOpponent(plan, opponentLegend, opponentDeck),
    );
    return matching.length > 0 ? matching : deckPlans;
  }, [deckPlans, opponentLegend, opponentDeck]);

  const mainDeckCards = useMemo(() => {
    const names: string[] = [];
    for (const plan of deckPlans) {
      for (const s of plan.swaps) {
        if (s.outCard?.trim()) names.push(s.outCard);
      }
    }
    names.push(...knownOutCardsFromMatches(matches, ownDeck));
    return names;
  }, [deckPlans, matches, ownDeck]);

  const games: GameResult[] = useMemo(() => {
    if (format !== 'Bo3') return [];
    const list: GameResult[] = [
      {
        id: gameIds[1] || createId(),
        gameNumber: 1,
        outcome: game1,
        sideboard: emptySideboardSession(false),
      },
      {
        id: gameIds[2] || createId(),
        gameNumber: 2,
        outcome: game2,
        sideboard: sessionFromState(2, sb2),
      },
    ];
    if (game3Enabled) {
      list.push({
        id: gameIds[3] || createId(),
        gameNumber: 3,
        outcome: game3,
        sideboard: sessionFromState(3, sb3),
      });
    }
    return list;
  }, [format, game1, game2, game3, game3Enabled, gameIds, sb2, sb3]);

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed' || !selected) return;
    setDate(selected);
  };

  const openPicker = (mode: 'date' | 'time') => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  const applyPlanToGame = (
    planId: string,
    setter: React.Dispatch<React.SetStateAction<GameSbState>>,
  ) => {
    const plan = getPlan(planId);
    if (!plan) return;
    setter({
      fromPlanId: plan.id,
      actualSwaps: plan.swaps.map((s) => ({ ...s })),
      planFollowed: 'yes',
      enabled: true,
    });
  };

  const oppLegendMissing = !opponentLegend.trim();
  const showLegendNudge = oppLegendMissing && (legendTouched || saveAttempted);
  const canSave = !oppLegendMissing;

  const onSave = async () => {
    if (oppLegendMissing) {
      setSaveAttempted(true);
      return;
    }

    for (const [label, state] of [
      ['Game 2', sb2],
      ['Game 3', sb3],
    ] as const) {
      if (format !== 'Bo3') break;
      if (label === 'Game 3' && !game3Enabled) continue;
      const incomplete = state.actualSwaps.some(
        (s) =>
          (s.outCard.trim() && !s.inCard.trim()) ||
          (!s.outCard.trim() && s.inCard.trim()),
      );
      if (incomplete) {
        Alert.alert(
          'Incomplete swap',
          `${label}: each sideboard swap must be 1-for-1 (both OUT and IN).`,
        );
        return;
      }
      const junk = state.actualSwaps.some(
        (s) => isJunkCardName(s.outCard) || isJunkCardName(s.inCard),
      );
      if (junk) {
        Alert.alert(
          'Card name too short',
          `${label}: card names need at least 2 characters.`,
        );
        return;
      }
      if (normalizeSwaps(state.actualSwaps).length > SIDEBOARD_MAX) {
        Alert.alert('Too many swaps', `${label}: max ${SIDEBOARD_MAX} swaps.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        date: date.toISOString(),
        eventType,
        format,
        ownDeck: normalizeDeckName(ownDeck),
        ownLegend: normalizeDeckName(ownLegend),
        opponentDeck: normalizeDeckName(opponentDeck),
        opponentLegend: normalizeDeckName(opponentLegend),
        outcome,
        games,
        note: {
          ...emptyNote(),
          oneLiner: oneLiner.trim(),
          mistakeTags,
        },
      };

      if (isEdit && existing) {
        await updateMatch(existing.id, payload);
        router.back();
      } else {
        const created = await addMatch(payload);
        router.replace(`/match/${created.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const onFormatChange = (next: MatchFormat) => {
    setFormat(next);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SectionCard title="Result">
          <SegmentedControl
            options={MATCH_OUTCOMES}
            value={outcome}
            onChange={setOutcome}
          />
          <View>
            <FieldLabel>Type</FieldLabel>
            <SegmentedControl
              options={EVENT_TYPES}
              value={eventType}
              onChange={setEventType}
            />
          </View>
          <View>
            <FieldLabel>Date & time</FieldLabel>
            <View style={styles.dateRow}>
              <Pressable style={styles.dateBtn} onPress={() => openPicker('date')}>
                <Text style={styles.dateText}>{formatMatchDate(date.toISOString())}</Text>
              </Pressable>
              {Platform.OS === 'ios' ? (
                <Pressable style={styles.dateBtn} onPress={() => openPicker('time')}>
                  <Text style={styles.dateText}>Change time</Text>
                </Pressable>
              ) : null}
            </View>
            {showPicker ? (
              <DateTimePicker
                value={date}
                mode={pickerMode}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onPickerChange}
                themeVariant="dark"
              />
            ) : null}
            {Platform.OS === 'ios' && showPicker ? (
              <Pressable onPress={() => setShowPicker(false)} style={styles.donePicker}>
                <Text style={styles.donePickerText}>Done</Text>
              </Pressable>
            ) : null}
          </View>
        </SectionCard>

        <SectionCard title="Decks">
          <View>
            <FieldLabel>Your deck</FieldLabel>
            {deckChips.length > 0 ? (
              <View style={styles.chipRow}>
                {deckChips.map((deck) => {
                  const active =
                    !ownDeckOther &&
                    deckLookupKey(ownDeck) === deckLookupKey(deck);
                  return (
                    <Chip
                      key={deck}
                      label={deck}
                      active={active}
                      onPress={() => {
                        setOwnDeck(deck);
                        setOwnDeckOther(false);
                      }}
                    />
                  );
                })}
                <Chip
                  label="Other…"
                  active={ownDeckOther}
                  onPress={() => {
                    setOwnDeckOther(true);
                    if (
                      deckChips.some(
                        (d) => deckLookupKey(d) === deckLookupKey(ownDeck),
                      )
                    ) {
                      setOwnDeck('');
                    }
                  }}
                />
              </View>
            ) : null}
            {ownDeckOther ||
            deckChips.length === 0 ||
            (Boolean(ownDeck) &&
              !deckChips.some(
                (d) => deckLookupKey(d) === deckLookupKey(ownDeck),
              )) ? (
              <View style={{ marginTop: deckChips.length ? 10 : 0 }}>
                <TextField
                  value={ownDeck}
                  onChangeText={(t) => {
                    setOwnDeck(t);
                    setOwnDeckOther(true);
                  }}
                  placeholder="e.g. Miracle Kennen"
                  onBlur={() => setOwnDeck(normalizeDeckName(ownDeck))}
                />
              </View>
            ) : ownDeck ? (
              <Text style={styles.selectedHint}>Selected: {ownDeck}</Text>
            ) : (
              <Text style={styles.selectedHint}>Pick a deck or Other…</Text>
            )}
          </View>
          <View>
            <FieldLabel>Your legend</FieldLabel>
            <TextField value={ownLegend} onChangeText={setOwnLegend} placeholder="Optional" />
          </View>
          <View>
            <FieldLabel>Opponent legend</FieldLabel>
            {recentLegends.length > 0 ? (
              <View style={styles.chipRow}>
                {recentLegends.map((legend) => (
                  <Chip
                    key={legend}
                    label={legend}
                    active={
                      deckLookupKey(opponentLegend) === deckLookupKey(legend)
                    }
                    onPress={() => setOpponentLegend(legend)}
                  />
                ))}
              </View>
            ) : null}
            <View style={{ marginTop: recentLegends.length ? 10 : 0 }}>
              <TextField
                value={opponentLegend}
                onChangeText={setOpponentLegend}
                placeholder="e.g. Lillia"
                invalid={showLegendNudge}
                onBlur={() => {
                  setLegendTouched(true);
                  setOpponentLegend(normalizeDeckName(opponentLegend));
                }}
              />
            </View>
            {showLegendNudge ? (
              <Text style={styles.fieldError}>Opponent legend is required</Text>
            ) : null}
          </View>
          <View>
            <FieldLabel>Opponent deck</FieldLabel>
            <TextField
              value={opponentDeck}
              onChangeText={setOpponentDeck}
              placeholder="Optional — e.g. Ornn Control"
            />
          </View>
        </SectionCard>

        <SectionCard title="Format">
          <SegmentedControl
            options={MATCH_FORMATS}
            value={format}
            onChange={onFormatChange}
          />

          {format === 'Bo3' ? (
            <View style={styles.bo3Block}>
              <SectionLabel>Games</SectionLabel>
              <CompactGameRow label="G1" value={game1} onChange={setGame1} />
              <LockBanner />
              <CompactGameRow label="G2" value={game2} onChange={setGame2} />
              <GameSideboardEditor
                label="Game 2"
                state={sb2}
                onChange={setSb2}
                plans={filteredPlans}
                onApplyPlan={(planId) => applyPlanToGame(planId, setSb2)}
                sideboardCards={sideboardCards}
                mainDeckCards={mainDeckCards}
              />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Played Game 3</Text>
                <Switch
                  value={game3Enabled}
                  onValueChange={setGame3Enabled}
                  trackColor={{ false: colors.hairline, true: colors.accentMuted }}
                  thumbColor={game3Enabled ? colors.accent : '#f4f3f4'}
                />
              </View>
              {game3Enabled ? (
                <>
                  <CompactGameRow label="G3" value={game3} onChange={setGame3} />
                  <GameSideboardEditor
                    label="Game 3"
                    state={sb3}
                    onChange={setSb3}
                    plans={filteredPlans}
                    onApplyPlan={(planId) => applyPlanToGame(planId, setSb3)}
                    sideboardCards={sideboardCards}
                    mainDeckCards={mainDeckCards}
                  />
                </>
              ) : null}
            </View>
          ) : null}
        </SectionCard>

        <SectionCard title="Mistakes">
          <TagPicker selected={mistakeTags} onChange={setMistakeTags} />
        </SectionCard>

        <SectionCard title="Notes" inset>
          <View>
            <FieldLabel>Note (optional)</FieldLabel>
            <TextField
              value={oneLiner}
              onChangeText={setOneLiner}
              placeholder="One short line"
            />
          </View>
        </SectionCard>

        <View style={{ height: 16 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <PrimaryButton
          label={isEdit ? 'Save match' : 'Save match'}
          onPress={onSave}
          loading={saving}
          disabled={!canSave}
        />
        <PrimaryButton
          label="Cancel"
          onPress={() => router.back()}
          variant="ghost"
        />
      </View>
    </View>
  );
}

function CompactGameRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: MatchOutcome;
  onChange: (v: MatchOutcome) => void;
}) {
  return (
    <View style={styles.compactGame}>
      <Text style={styles.compactLabel}>{label}</Text>
      <View style={{ flex: 1 }}>
        <SegmentedControl options={MATCH_OUTCOMES} value={value} onChange={onChange} />
      </View>
    </View>
  );
}

function GameSideboardEditor({
  label,
  state,
  onChange,
  plans,
  onApplyPlan,
  sideboardCards,
  mainDeckCards,
}: {
  label: string;
  state: GameSbState;
  onChange: (next: GameSbState) => void;
  plans: { id: string; vsLegend: string; vsArchetype: string; swaps: SideboardSwap[] }[];
  onApplyPlan: (planId: string) => void;
  sideboardCards: string[];
  mainDeckCards: string[];
}) {
  return (
    <View style={styles.sbBlock}>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Log sideboard ({label})</Text>
        <Switch
          value={state.enabled}
          onValueChange={(enabled) =>
            onChange({
              ...state,
              enabled,
            })
          }
          trackColor={{ false: colors.hairline, true: colors.accentMuted }}
          thumbColor={state.enabled ? colors.accent : '#f4f3f4'}
        />
      </View>

      {state.enabled ? (
        <View style={{ gap: 12 }}>
          {plans.length > 0 ? (
            <View>
              <FieldLabel>From plan (optional)</FieldLabel>
              <View style={styles.planChips}>
                <Pressable
                  onPress={() =>
                    onChange({
                      ...state,
                      fromPlanId: undefined,
                      planFollowed:
                        state.actualSwaps.length > 0 ? state.planFollowed : 'no_plan',
                    })
                  }
                  style={[
                    styles.planChip,
                    !state.fromPlanId && styles.planChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.planChipText,
                      !state.fromPlanId && styles.planChipTextActive,
                    ]}
                  >
                    None
                  </Text>
                </Pressable>
                {plans.map((plan) => {
                  const active = state.fromPlanId === plan.id;
                  return (
                    <Pressable
                      key={plan.id}
                      onPress={() => onApplyPlan(plan.id)}
                      style={[styles.planChip, active && styles.planChipActive]}
                    >
                      <Text
                        style={[
                          styles.planChipText,
                          active && styles.planChipTextActive,
                        ]}
                      >
                        {planTitle(plan)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <Text style={styles.sbHint}>
              No matchup plans for this deck yet. Create one in the Sideboard tab, or log swaps freely below.
            </Text>
          )}

          <View>
            <FieldLabel>Actual swaps (1-for-1)</FieldLabel>
            <SwapPairEditor
              swaps={
                state.actualSwaps.length > 0
                  ? state.actualSwaps
                  : [{ outCard: '', inCard: '' }]
              }
              onChange={(actualSwaps) => onChange({ ...state, actualSwaps })}
              max={SIDEBOARD_MAX}
              sideboardCards={sideboardCards}
              mainDeckCards={mainDeckCards}
            />
          </View>

          <View>
            <FieldLabel>Followed plan?</FieldLabel>
            <PlanFollowedChips
              value={state.planFollowed}
              onChange={(planFollowed) => onChange({ ...state, planFollowed })}
            />
          </View>

          {(state.fromPlanId ||
            normalizeSwaps(state.actualSwaps).length > 0) ? (
            <PlanActualDiff
              compact
              planned={
                state.fromPlanId
                  ? plans.find((p) => p.id === state.fromPlanId)?.swaps
                  : undefined
              }
              actual={state.actualSwaps}
              fromPlanId={state.fromPlanId}
              planFollowed={state.planFollowed}
              planLabel={
                state.fromPlanId
                  ? planTitle(
                      plans.find((p) => p.id === state.fromPlanId) ?? {
                        vsLegend: '',
                        vsArchetype: '',
                      },
                    )
                  : undefined
              }
            />
          ) : null}
        </View>
      ) : (
        <Text style={styles.sbHint}>
          Turn on to record boarded cards vs your plan for {label}.
        </Text>
      )}
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
  },
  dateRow: {
    gap: 8,
  },
  dateBtn: {
    minHeight: spacing.hitTarget,
    borderRadius: 12,
    backgroundColor: colors.inset,
    borderWidth: 1,
    borderColor: colors.hairline,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dateText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  donePicker: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  donePickerText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedHint: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
  },
  bo3Block: {
    gap: 12,
  },
  compactGame: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
    width: 28,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: spacing.hitTarget,
  },
  switchLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    paddingRight: 12,
  },
  sbBlock: {
    gap: 8,
    backgroundColor: colors.inset,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  sbHint: {
    color: colors.textSecondary,
    ...typography.meta,
    lineHeight: 18,
  },
  planChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  planChip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: colors.hairline,
    justifyContent: 'center',
  },
  planChipActive: {
    backgroundColor: colors.chipActive,
    borderColor: colors.accent,
  },
  planChipText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  planChipTextActive: {
    color: colors.accent,
  },
  fieldError: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
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
