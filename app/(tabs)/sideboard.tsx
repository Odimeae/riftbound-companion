import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMatches } from '../../src/context/MatchContext';
import { useSideboard } from '../../src/context/SideboardContext';
import { FieldLabel } from '../../src/components/Field';
import { CardPicker } from '../../src/components/CardPicker';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { EmptyState } from '../../src/components/EmptyState';
import { SlotTile } from '../../src/components/SlotTile';
import { SectionLabel } from '../../src/components/SectionLabel';
import { Chip } from '../../src/components/Chip';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import {
  SIDEBOARD_MAX,
  planSubtitle,
  planTitle,
} from '../../src/types/sideboard';
import { deckLookupKey, normalizeDeckName } from '../../src/utils/deckName';

export default function SideboardScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { matches } = useMatches();
  const {
    loading,
    sideboards,
    getSideboardForDeck,
    upsertSideboardCards,
    plansForDeck,
  } = useSideboard();

  // Quiet header — no gear / no nav title
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerRight: () => null, headerTitle: '' });
    }, [navigation]),
  );

  // Unique exact deck names from matches (one chip per canonical name).
  const deckSuggestions = useMemo(() => {
    const set = new Map<string, string>();
    for (const m of matches) {
      const name = normalizeDeckName(m.ownDeck);
      if (name) set.set(deckLookupKey(name), name);
    }
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }, [matches]);

  const [deckName, setDeckName] = useState('Miracle Kennen');
  const [cards, setCards] = useState<string[]>([]);
  const [pickerValue, setPickerValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  /** Known SB / IN card names for anti-typing picker. */
  const knownSbCards = useMemo(() => {
    const map = new Map<string, string>();
    const push = (raw: string) => {
      const n = normalizeDeckName(raw);
      if (!n || n.length < 2) return;
      map.set(deckLookupKey(n), n);
    };
    for (const sb of sideboards) {
      for (const c of sb.cards) push(c);
    }
    for (const m of matches) {
      for (const g of m.games) {
        for (const s of g.sideboard?.actualSwaps ?? []) {
          if (s.inCard) push(s.inCard);
        }
      }
    }
    for (const c of cards) push(c);
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [sideboards, matches, cards]);


  useEffect(() => {
    if (hydrated) return;
    if (deckSuggestions.length > 0) {
      const preferred =
        deckSuggestions.find((d) => d.toLowerCase() === 'miracle kennen') ??
        deckSuggestions[0];
      setDeckName(preferred);
    }
    setHydrated(true);
  }, [deckSuggestions, hydrated]);

  useEffect(() => {
    const existing = getSideboardForDeck(deckName);
    setCards(existing?.cards ?? []);
  }, [deckName, getSideboardForDeck]);

  const plans = plansForDeck(deckName);
  const atMax = cards.length >= SIDEBOARD_MAX;
  const deckLabel = normalizeDeckName(deckName) || 'Deck';

  /** Designer P1: Compare only when plan linked AND actual swaps exist. */
  const compareTargetForPlan = (planId: string) => {
    const deckKey = deckLookupKey(deckName);
    if (!deckKey) return undefined;
    for (const m of matches) {
      if (deckLookupKey(m.ownDeck) !== deckKey) continue;
      if (m.format !== 'Bo3') continue;
      for (const g of m.games) {
        const sb = g.sideboard;
        if (!sb || sb.fromPlanId !== planId) continue;
        const hasActual = (sb.actualSwaps?.length ?? 0) > 0;
        if (!hasActual) continue;
        return { matchId: m.id, gameNumber: g.gameNumber, planId };
      }
    }
    return undefined;
  };

  const addCardName = async (raw: string) => {
    const name = normalizeDeckName(raw);
    if (!name || name.length < 2) return;
    if (atMax) {
      Alert.alert('Sideboard full', `Maximum ${SIDEBOARD_MAX} cards.`);
      return;
    }
    if (cards.some((c) => deckLookupKey(c) === deckLookupKey(name))) {
      setPickerValue('');
      return;
    }
    const next = [...cards, name];
    setCards(next);
    setPickerValue('');
    setSaving(true);
    try {
      await upsertSideboardCards(normalizeDeckName(deckName), next);
    } finally {
      setSaving(false);
    }
  };

  const removeCard = async (index: number) => {
    const next = cards.filter((_, i) => i !== index);
    setCards(next);
    setSaving(true);
    try {
      await upsertSideboardCards(normalizeDeckName(deckName), next);
    } finally {
      setSaving(false);
    }
  };

  const onSaveSideboard = async () => {
    const canonical = normalizeDeckName(deckName);
    if (!canonical) {
      Alert.alert('Deck name required', 'Select a deck before saving.');
      return;
    }
    setDeckName(canonical);
    setSaving(true);
    try {
      await upsertSideboardCards(canonical, cards);
    } finally {
      setSaving(false);
    }
  };

  const openNewPlan = () => {
    router.push({
      pathname: '/sideboard/plan',
      params: { deckName: normalizeDeckName(deckName) || 'Miracle Kennen' },
    });
  };

  if (loading && !hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 24 + spacing.hitTarget + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Large title + meta */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Sideboard</Text>
          <Text style={styles.headerMeta}>
            {cards.length}/{SIDEBOARD_MAX} slots · {deckLabel}
          </Text>
        </View>

        {/* Deck switch — chips only (no duplicate text field) */}
        <View style={styles.block}>
          <SectionLabel>Deck switch</SectionLabel>
          {deckSuggestions.length > 0 ? (
            <View style={styles.chipRow}>
              {deckSuggestions.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  active={deckLookupKey(name) === deckLookupKey(deckName)}
                  onPress={() => setDeckName(name)}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.hint}>
              Log a match to unlock deck chips. Sideboard stays keyed to the
              selected deck name.
            </Text>
          )}
        </View>

        {/* Matchup plans — e0 flat rows; New plan e1; Compare when linked */}
        <View style={styles.block}>
          <SectionLabel>Matchup plans</SectionLabel>

          {plans.length === 0 ? (
            <EmptyState
              title="No plans yet"
              message="Create a plan for a tough legend or archetype (e.g. vs control)."
              icon="git-compare-outline"
              ctaLabel="New plan"
              onPress={openNewPlan}
              ctaVariant="ghost"
            />
          ) : (
            <>
              <View style={styles.planList}>
                {plans.map((plan, index) => (
                  <Pressable
                    key={plan.id}
                    style={[
                      styles.planRow,
                      index > 0 && styles.planRowDivider,
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: '/sideboard/plan',
                        params: { id: plan.id },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${planTitle(plan)}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planTitle}>{planTitle(plan)}</Text>
                      <Text style={styles.planSub}>{planSubtitle(plan)}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.inactive}
                    />
                  </Pressable>
                ))}
              </View>

              <View style={styles.actions}>
                <PrimaryButton
                  label="New plan"
                  onPress={openNewPlan}
                  variant="ghost"
                />
                {(() => {
                  const linked = plans
                    .map((p) => compareTargetForPlan(p.id))
                    .find((x) => x);
                  if (!linked) return null;
                  return (
                    <PrimaryButton
                      label="Compare"
                      onPress={() =>
                        router.push({
                          pathname: '/match/compare',
                          params: {
                            matchId: linked.matchId,
                            gameNumber: String(linked.gameNumber),
                            planId: linked.planId,
                          },
                        })
                      }
                      variant="ghost"
                    />
                  );
                })()}
              </View>
            </>
          )}
        </View>

        {/* Slots — filled e1 / empty dashed */}
        <View style={styles.block}>
          <SectionLabel>Slots</SectionLabel>
          <View style={styles.slots}>
            {Array.from({ length: SIDEBOARD_MAX }).map((_, index) => (
              <SlotTile
                key={`slot-${index}`}
                index={index}
                name={cards[index]}
                onClear={cards[index] ? () => removeCard(index) : undefined}
              />
            ))}
          </View>
        </View>

        {/* Add card — chip picker + Other… */}
        <View style={styles.addBlock}>
          <FieldLabel>Add card</FieldLabel>
          {atMax ? (
            <Text style={styles.hint}>Sideboard full ({SIDEBOARD_MAX} slots).</Text>
          ) : (
            <CardPicker
              options={knownSbCards.filter(
                (c) => !cards.some((x) => deckLookupKey(x) === deckLookupKey(c)),
              )}
              value={pickerValue}
              onChange={(name) => {
                setPickerValue(name);
                void addCardName(name);
              }}
              placeholder="Card name"
              emptyHint="No known cards yet — use Other…"
            />
          )}
        </View>
      </ScrollView>

      {/* Sticky footer — Save sideboard e2 only */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <PrimaryButton
          label="Save sideboard"
          onPress={onSaveSideboard}
          loading={saving}
          depth="e2"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    padding: spacing.screenPad,
    gap: spacing.blockGap,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: 4,
    paddingTop: 4,
  },
  screenTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  headerMeta: {
    color: colors.textSecondary,
    ...typography.meta,
  },
  block: {
    gap: 10,
  },
  hint: {
    color: colors.textSecondary,
    ...typography.meta,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slots: {
    gap: 8,
  },
  addBlock: {
    gap: 0,
    marginTop: 4,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  addBtn: {
    width: spacing.hitTarget,
    height: spacing.hitTarget,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  /** e0 flat plan list — hairline separators, no nested card */
  planList: {
    backgroundColor: colors.background,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: spacing.rowMinH,
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  planRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  planTitle: {
    color: colors.text,
    ...typography.title,
  },
  planSub: {
    color: colors.textSecondary,
    ...typography.meta,
    marginTop: 2,
  },
  actions: {
    gap: 8,
    marginTop: 4,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenPad,
    paddingTop: 12,
  },
});
