import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { showAlert } from '../../src/utils/alert';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMatches } from '../../src/context/MatchContext';
import { useSideboard } from '../../src/context/SideboardContext';
import { useDecks } from '../../src/context/DeckContext';
import { FieldLabel, TextField } from '../../src/components/Field';
import { CardPicker } from '../../src/components/CardPicker';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { EmptyState } from '../../src/components/EmptyState';
import { SlotTile } from '../../src/components/SlotTile';
import { SectionLabel } from '../../src/components/SectionLabel';
import { Chip } from '../../src/components/Chip';
import { DeckCardRow } from '../../src/components/DeckCardRow';
import { colors } from '../../src/theme/colors';
import { spacing, stickyFormContentInset } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import {
  SIDEBOARD_MAX,
  planSubtitle,
  planTitle,
} from '../../src/types/sideboard';
import { deckLookupKey, normalizeDeckName } from '../../src/utils/deckName';
import {
  countNamedEntries,
  deckNeedsNameEnrich,
  mainCardCount,
  paCdnArtUrl,
  remapSlotLabels,
} from '../../src/utils/piltoverImport';
import { isFuzzyMatch } from '../../src/utils/cardResolve';

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
  const {
    decks: companionDecks,
    getDeckForName,
    importFromPiltover,
    refreshFromPiltover,
  } = useDecks();

  // Quiet header — no gear / no nav title
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerRight: () => null, headerTitle: '' });
    }, [navigation]),
  );

  // Unique exact deck names from matches + sideboards + PA imports.
  const deckSuggestions = useMemo(() => {
    const set = new Map<string, string>();
    const push = (raw: string) => {
      const name = normalizeDeckName(raw);
      if (name) set.set(deckLookupKey(name), name);
    };
    for (const m of matches) push(m.ownDeck);
    for (const sb of sideboards) push(sb.deckName);
    for (const d of companionDecks) push(d.deckName);
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }, [matches, sideboards, companionDecks]);

  const [deckName, setDeckName] = useState('Miracle Kennen');
  const [cards, setCards] = useState<string[]>([]);
  const [pickerValue, setPickerValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [importName, setImportName] = useState('');
  const [importing, setImporting] = useState(false);
  const [refreshingDeck, setRefreshingDeck] = useState(false);
  const [autoEnriching, setAutoEnriching] = useState(false);
  const autoEnrichKeyRef = React.useRef<string>('');

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
      showAlert('Sideboard full', `Maximum ${SIDEBOARD_MAX} cards.`);
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
      showAlert('Deck name required', 'Select a deck before saving.');
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


  const linkedDeck = getDeckForName(deckName);

  // Auto-enrich PA names when list is still mostly codes (no manual Refresh needed).
  useEffect(() => {
    const deck = linkedDeck;
    if (!deck?.piltoverUrl && !deck?.deckCode) return;
    if (!deckNeedsNameEnrich(deck.mainCards)) return;
    if (refreshingDeck || importing || autoEnriching) return;
    const key = `${deck.id}:${deck.deckCode || deck.piltoverUrl || ''}`;
    if (autoEnrichKeyRef.current === key) return;
    autoEnrichKeyRef.current = key;
    let cancelled = false;
    (async () => {
      setAutoEnriching(true);
      try {
        const result = await refreshFromPiltover(
          deck.deckName,
          knownNamesForImport,
        );
        if (cancelled) return;
        const remapped = remapSlotLabels(cards, [
          ...result.deck.sideboardCards,
          ...result.deck.mainCards,
        ]);
        if (remapped.some((v, i) => v !== cards[i])) {
          setCards(remapped);
          await upsertSideboardCards(result.deck.deckName, remapped);
        }
      } catch {
        // Allow retry next focus if fetch failed
        autoEnrichKeyRef.current = '';
      } finally {
        if (!cancelled) setAutoEnriching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedDeck?.id, linkedDeck?.updatedAt, linkedDeck?.deckCode, linkedDeck?.piltoverUrl]);

  // Keep import name field in sync with selected deck chip unless user typed.
  useEffect(() => {
    setImportName((prev) => {
      const selected = normalizeDeckName(deckName);
      if (!prev.trim()) return selected;
      // If previous matched prior selection patterns, follow chip.
      return selected;
    });
  }, [deckName]);

  const knownNamesForImport = useMemo(() => {
    const names = [...knownSbCards, ...cards];
    if (linkedDeck) {
      for (const c of linkedDeck.mainCards) names.push(c.name);
      for (const c of linkedDeck.sideboardCards) names.push(c.name);
    }
    return names;
  }, [knownSbCards, cards, linkedDeck]);

  const applySideboardFromImport = async (
    slotNames: string[],
    forDeck?: string,
  ) => {
    if (!slotNames.length) return;
    const canonical =
      normalizeDeckName(forDeck || '') ||
      normalizeDeckName(deckName) ||
      normalizeDeckName(importName);
    if (!canonical) return;
    setDeckName(canonical);
    setCards(slotNames);
    setSaving(true);
    try {
      await upsertSideboardCards(canonical, slotNames);
    } finally {
      setSaving(false);
    }
  };

  const onImportPiltover = async () => {
    if (!importInput.trim()) {
      showAlert(
        'URL or code required',
        'Paste a Piltover Archive deck URL or raw deck code.',
      );
      return;
    }
    // Prefer explicit Title Case field; blank → PA <title> via importer.
    const name = normalizeDeckName(importName || deckName);
    setImporting(true);
    try {
      const result = await importFromPiltover(
        importInput.trim(),
        name,
        knownNamesForImport,
      );
      setDeckName(result.deck.deckName);
      setImportName(result.deck.deckName);
      const mainN = mainCardCount(result.deck.mainCards);
      const sbN = mainCardCount(result.deck.sideboardCards);
      showAlert(
        'Imported',
        `Linked “${result.deck.deckName}” — ${mainN} main · ${sbN} sideboard cards.\nFill sideboard slots from this import?`,
        [
          { text: 'Keep slots', style: 'cancel' },
          {
            text: 'Fill sideboard',
            onPress: () => {
              void applySideboardFromImport(result.sideboardSlotNames, result.deck.deckName);
            },
          },
        ],
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed.';
      showAlert('Import failed', msg);
    } finally {
      setImporting(false);
    }
  };

  const onRefreshPiltover = async () => {
    const name = normalizeDeckName(deckName);
    if (!name) return;
    setRefreshingDeck(true);
    try {
      const result = await refreshFromPiltover(name, knownNamesForImport);
      const mainN = mainCardCount(result.deck.mainCards);
      const sbN = mainCardCount(result.deck.sideboardCards);
      const { named, total } = countNamedEntries(result.deck.mainCards);
      // Remap current slots codes → names without wiping custom picks
      const remapped = remapSlotLabels(cards, [
        ...result.deck.sideboardCards,
        ...result.deck.mainCards,
      ]);
      if (remapped.some((v, i) => v !== cards[i])) {
        setCards(remapped);
        await upsertSideboardCards(result.deck.deckName, remapped);
      }
      showAlert(
        'Refreshed',
        `Updated “${result.deck.deckName}” — ${mainN} main · ${sbN} sideboard.\nNames resolved: ${named}/${total}.\nReplace sideboard slots from import?`,
        [
          { text: 'Keep slots', style: 'cancel' },
          {
            text: 'Fill sideboard',
            onPress: () => {
              void applySideboardFromImport(result.sideboardSlotNames, result.deck.deckName);
            },
          },
        ],
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Refresh failed.';
      showAlert('Refresh failed', msg);
    } finally {
      setRefreshingDeck(false);
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
          { paddingBottom: stickyFormContentInset(insets.bottom, false) },
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

        {/* Piltover Archive — local deck list import (no account) */}
        <View style={styles.block}>
          <SectionLabel>Piltover Archive</SectionLabel>
          <Text style={styles.hint}>
            Paste a deck URL (/decks/view/… or deckbuilder?code=…) or a raw deck
            code. Lists stay on this device — no Piltover login.
          </Text>
          <FieldLabel>Deck name</FieldLabel>
          <TextField
            value={importName}
            onChangeText={setImportName}
            placeholder="Title Case deck name"
            autoCapitalize="words"
          />
          <View style={{ height: 10 }} />
          <FieldLabel>URL or deck code</FieldLabel>
          <TextField
            value={importInput}
            onChangeText={setImportInput}
            placeholder="https://piltoverarchive.com/decks/view/… or code"
            autoCapitalize="none"
          />
          <View style={styles.importActions}>
            <PrimaryButton
              label="Import from Piltover Archive"
              onPress={() => {
                void onImportPiltover();
              }}
              loading={importing}
            />
            {linkedDeck ? (
              <PrimaryButton
                label="Refresh"
                onPress={() => {
                  void onRefreshPiltover();
                }}
                loading={refreshingDeck}
                variant="ghost"
              />
            ) : null}
          </View>
          {linkedDeck ? (
            <Text style={styles.linkMeta}>
              Linked · {mainCardCount(linkedDeck.mainCards)} main ·{' '}
              {mainCardCount(linkedDeck.sideboardCards)} SB
              {linkedDeck.updatedAt
                ? ` · ${new Date(linkedDeck.updatedAt).toLocaleString()}`
                : ''}
              {autoEnriching ? ' · Resolving names…' : ''}
              {!autoEnriching
                ? (() => {
                    const { named, total } = countNamedEntries(
                      linkedDeck.mainCards,
                    );
                    return total
                      ? ` · ${named}/${total} names`
                      : '';
                  })()
                : ''}
            </Text>
          ) : (
            <Text style={styles.hint}>
              No list linked to this deck yet. Import to fill OUT pickers.
            </Text>
          )}
        </View>

        {linkedDeck && linkedDeck.mainCards.length > 0 ? (
          <View style={styles.block}>
            <SectionLabel>Main pool</SectionLabel>
            <Text style={styles.hint}>
              OUT pickers use this list. Art from Piltover CDN for now; Riot URI later.
            </Text>
            <View style={styles.mainList}>
              {linkedDeck.mainCards.slice(0, 24).map((c) => (
                <DeckCardRow
                  key={`${c.code || c.name}-${c.id || ''}`}
                  name={c.name}
                  qty={c.qty}
                  code={c.code}
                  catalogId={c.id}
                  imageUrl={c.imageUrl}
                  fuzzy={isFuzzyMatch(c.code || c.name)}
                />
              ))}
              {linkedDeck.mainCards.length > 24 ? (
                <Text style={styles.hint}>
                  +{linkedDeck.mainCards.length - 24} more
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Matchup plans — e0 flat rows; New plan e1; Compare when linked */}
        <View style={styles.block}>
          <SectionLabel>Matchup plans</SectionLabel>

          {plans.length === 0 ? (
            <EmptyState
              title="No plans yet"
              message="Add a plan for a tough matchup."
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
                    <Pressable
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
                      hitSlop={8}
                      accessibilityRole="button"
                      style={styles.compareLink}
                    >
                      <Text style={styles.compareLinkText}>Compare plan vs actual</Text>
                    </Pressable>
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
            {Array.from({ length: SIDEBOARD_MAX }).map((_, index) => {
              const slotName = cards[index];
              const fromList = slotName
                ? [...(linkedDeck?.sideboardCards ?? []), ...(linkedDeck?.mainCards ?? [])].find(
                    (c) =>
                      deckLookupKey(c.name) === deckLookupKey(slotName) ||
                      (c.code &&
                        deckLookupKey(c.code) === deckLookupKey(slotName)),
                  )
                : undefined;
              const slotArt =
                fromList?.imageUrl ||
                (fromList?.code ? paCdnArtUrl(fromList.code) : undefined) ||
                (slotName ? paCdnArtUrl(slotName) : undefined);
              return (
              <SlotTile
                key={`slot-${index}`}
                index={index}
                name={slotName}
                imageUrl={slotArt}
                fuzzy={slotName ? isFuzzyMatch(slotName) : false}
                onClear={slotName ? () => removeCard(index) : undefined}
              />
            );
            })}
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
              placeholder="Search cards"
              emptyHint="No cards found"
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
    gap: spacing.sectionGap,
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
    gap: spacing.chipGap,
  },
  slots: {
    gap: spacing.chipGap,
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
    gap: spacing.chipGap,
    minHeight: spacing.rowMinH,
    paddingVertical: spacing.rowPadV,
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
  compareLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  compareLinkText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    gap: spacing.chipGap,
    marginTop: 4,
  },
  importActions: {
    gap: spacing.chipGap,
    marginTop: 12,
  },
  mainList: {
    gap: 4,
  },
  linkMeta: {
    color: colors.textMuted,
    ...typography.meta,
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
