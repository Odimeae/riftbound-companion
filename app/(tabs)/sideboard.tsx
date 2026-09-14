import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
import { CardPicker, CardPickerOptionMeta } from '../../src/components/CardPicker';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { EmptyState } from '../../src/components/EmptyState';
import { SlotTile } from '../../src/components/SlotTile';
import { SectionLabel } from '../../src/components/SectionLabel';
import { Chip } from '../../src/components/Chip';
import { SegmentedControl } from '../../src/components/SegmentedControl';
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

const SIDEBOARD_TABS = ['Slots', 'Plans'] as const;
type SideboardTab = (typeof SIDEBOARD_TABS)[number];

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

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerRight: () => null, headerTitle: '' });
    }, [navigation]),
  );

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
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<SideboardTab>('Slots');
  const [importOpen, setImportOpen] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [refreshingDeck, setRefreshingDeck] = useState(false);
  const [autoEnriching, setAutoEnriching] = useState(false);
  const autoEnrichKeyRef = React.useRef<string>('');
  /** Slot index open in CardPicker sheet; null = closed */
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);
  const [pickerValue, setPickerValue] = useState('');

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
  const linkedDeck = getDeckForName(deckName);

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

  const compareTarget = useMemo(() => {
    for (const p of plans) {
      const t = compareTargetForPlan(p.id);
      if (t) return t;
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, matches, deckName]);

  /** Pool for CardPicker only — Main + SB from linked deck + known SB names. */
  const pickerOptions = useMemo(() => {
    const map = new Map<string, string>();
    const push = (raw: string) => {
      const n = normalizeDeckName(raw);
      if (!n || n.length < 2) return;
      map.set(deckLookupKey(n), n);
    };
    for (const c of knownSbCards) push(c);
    if (linkedDeck) {
      for (const c of linkedDeck.mainCards) push(c.name);
      for (const c of linkedDeck.sideboardCards) push(c.name);
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [knownSbCards, linkedDeck]);

  const pickerOptionMeta = useMemo(() => {
    const meta: Record<string, CardPickerOptionMeta> = {};
    if (!linkedDeck) return meta;
    for (const c of linkedDeck.mainCards) {
      const key = deckLookupKey(c.name);
      if (!key) continue;
      meta[key] = {
        imageUrl: c.imageUrl || (c.code ? paCdnArtUrl(c.code) : undefined),
        pool: 'Main',
        qty: c.qty,
        fuzzy: isFuzzyMatch(c.code || c.name),
      };
    }
    for (const c of linkedDeck.sideboardCards) {
      const key = deckLookupKey(c.name);
      if (!key) continue;
      meta[key] = {
        imageUrl: c.imageUrl || (c.code ? paCdnArtUrl(c.code) : undefined),
        pool: 'SB',
        qty: c.qty,
        fuzzy: isFuzzyMatch(c.code || c.name),
      };
    }
    return meta;
  }, [linkedDeck]);

  const openSlotPicker = (index: number) => {
    setPickerValue(cards[index] ?? '');
    setPickingSlot(index);
  };

  const closeSlotPicker = () => {
    setPickingSlot(null);
    setPickerValue('');
  };

  const assignSlotCard = async (index: number, raw: string) => {
    const name = normalizeDeckName(raw);
    if (!name || name.length < 2) return;

    const next = [...cards];
    if (index < next.length) {
      // Replace filled slot — skip if duplicate elsewhere
      if (
        next.some(
          (c, i) =>
            i !== index && deckLookupKey(c) === deckLookupKey(name),
        )
      ) {
        closeSlotPicker();
        return;
      }
      next[index] = name;
    } else {
      // Empty slot → append (dense 01…n)
      if (atMax) {
        showAlert('Sideboard full', `Maximum ${SIDEBOARD_MAX} cards.`);
        closeSlotPicker();
        return;
      }
      if (next.some((c) => deckLookupKey(c) === deckLookupKey(name))) {
        closeSlotPicker();
        return;
      }
      next.push(name);
    }

    setCards(next);
    closeSlotPicker();
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

  // Auto-enrich PA names when list is still mostly codes.
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
      normalizeDeckName(forDeck || '') || normalizeDeckName(deckName);
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
    const name = normalizeDeckName(deckName);
    setImporting(true);
    try {
      const result = await importFromPiltover(
        importInput.trim(),
        name,
        knownNamesForImport,
      );
      setDeckName(result.deck.deckName);
      const mainN = mainCardCount(result.deck.mainCards);
      const sbN = mainCardCount(result.deck.sideboardCards);
      setImportOpen(false);
      showAlert(
        'Imported',
        `Linked “${result.deck.deckName}” — ${mainN} main · ${sbN} sideboard cards.\nFill sideboard slots from this import?`,
        [
          { text: 'Keep slots', style: 'cancel' },
          {
            text: 'Fill sideboard',
            onPress: () => {
              void applySideboardFromImport(
                result.sideboardSlotNames,
                result.deck.deckName,
              );
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
      const remapped = remapSlotLabels(cards, [
        ...result.deck.sideboardCards,
        ...result.deck.mainCards,
      ]);
      if (remapped.some((v, i) => v !== cards[i])) {
        setCards(remapped);
        await upsertSideboardCards(result.deck.deckName, remapped);
      }
      setImportOpen(false);
      showAlert(
        'Refreshed',
        `Updated “${result.deck.deckName}” — ${mainN} main · ${sbN} sideboard.\nNames resolved: ${named}/${total}.\nReplace sideboard slots from import?`,
        [
          { text: 'Keep slots', style: 'cancel' },
          {
            text: 'Fill sideboard',
            onPress: () => {
              void applySideboardFromImport(
                result.sideboardSlotNames,
                result.deck.deckName,
              );
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

  const stickyPad =
    tab === 'Slots'
      ? stickyFormContentInset(insets.bottom, false)
      : 24 + Math.max(insets.bottom, 0);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: stickyPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Sideboard</Text>
          <Text style={styles.headerMeta}>
            {cards.length}/{SIDEBOARD_MAX} slots · {deckLabel}
          </Text>
        </View>

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
            <Text style={styles.hint} numberOfLines={1}>
              Log a match to unlock deck chips.
            </Text>
          )}
        </View>

        <SegmentedControl
          options={SIDEBOARD_TABS}
          value={tab}
          onChange={setTab}
        />

        {tab === 'Slots' ? (
          <View style={styles.block}>
            <Pressable
              onPress={() => setImportOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Import deck"
              style={styles.quietLink}
            >
              <Text style={styles.quietLinkText}>Import deck</Text>
            </Pressable>

            <View style={styles.slots}>
              {Array.from({ length: SIDEBOARD_MAX }).map((_, index) => {
                const slotName = cards[index];
                const fromList = slotName
                  ? [
                      ...(linkedDeck?.sideboardCards ?? []),
                      ...(linkedDeck?.mainCards ?? []),
                    ].find(
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
                    onPress={() => openSlotPicker(index)}
                    onClear={slotName ? () => removeCard(index) : undefined}
                  />
                );
              })}
            </View>

            {linkedDeck && autoEnriching ? (
              <Text style={styles.linkMeta}>Resolving names…</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.block}>
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
                  {compareTarget ? (
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/match/compare',
                          params: {
                            matchId: compareTarget.matchId,
                            gameNumber: String(compareTarget.gameNumber),
                            planId: compareTarget.planId,
                          },
                        })
                      }
                      hitSlop={8}
                      accessibilityRole="button"
                      style={styles.quietLink}
                    >
                      <Text style={styles.quietLinkText}>Compare</Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {tab === 'Slots' ? (
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
      ) : null}

      {/* Import deck bottom sheet */}
      <Modal
        visible={importOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setImportOpen(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setImportOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close import"
          />
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Import deck</Text>
            <FieldLabel>URL or deck code</FieldLabel>
            <TextField
              value={importInput}
              onChangeText={setImportInput}
              placeholder="https://piltoverarchive.com/decks/view/… or code"
              autoCapitalize="none"
            />
            <Text style={styles.hint}>
              Piltover URL or deck code · stays on this device.
            </Text>
            <View style={styles.importActions}>
              <PrimaryButton
                label="Import"
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
                {!autoEnriching
                  ? (() => {
                      const { named, total } = countNamedEntries(
                        linkedDeck.mainCards,
                      );
                      return total ? ` · ${named}/${total} names` : '';
                    })()
                  : ''}
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Slot CardPicker sheet — pool lives here, not on Slots tab */}
      <Modal
        visible={pickingSlot !== null}
        transparent
        animationType="slide"
        onRequestClose={closeSlotPicker}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeSlotPicker}
            accessibilityRole="button"
            accessibilityLabel="Close picker"
          />
          <View
            style={[
              styles.sheet,
              styles.pickerSheet,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {pickingSlot !== null
                ? `Slot ${String(pickingSlot + 1).padStart(2, '0')}`
                : 'Pick card'}
            </Text>
            {pickingSlot !== null ? (
              <CardPicker
                options={pickerOptions.filter(
                  (c) =>
                    !cards.some(
                      (x, i) =>
                        i !== pickingSlot &&
                        deckLookupKey(x) === deckLookupKey(c),
                    ),
                )}
                value={pickerValue}
                onChange={(name) => {
                  setPickerValue(name);
                  void assignSlotCard(pickingSlot, name);
                }}
                placeholder="Search cards"
                emptyHint="No cards found"
                optionMeta={pickerOptionMeta}
              />
            ) : null}
          </View>
        </View>
      </Modal>
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
  quietLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingBottom: 2,
  },
  quietLinkText: {
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
    marginTop: 4,
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
  sheetOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: spacing.radius,
    borderTopRightRadius: spacing.radius,
    paddingHorizontal: spacing.screenPad,
    paddingTop: 10,
    gap: 12,
    borderTopWidth: 1,
    borderColor: colors.hairline,
    maxHeight: '88%',
  },
  pickerSheet: {
    minHeight: '55%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.hairline,
    marginBottom: 4,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
});
