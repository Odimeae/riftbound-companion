import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSideboard } from '../../src/context/SideboardContext';
import { useMatches } from '../../src/context/MatchContext';
import { FieldLabel, SectionCard, TextField } from '../../src/components/Field';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { SwapPairEditor } from '../../src/components/SwapPairEditor';
import { colors } from '../../src/theme/colors';
import {
  SIDEBOARD_MAX,
  SideboardSwap,
  normalizeSwaps,
} from '../../src/types/sideboard';
import { normalizeDeckName } from '../../src/utils/deckName';
import { knownOutCardsFromMatches } from '../../src/utils/stats';

export default function MatchupPlanScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id, deckName: deckParam } = useLocalSearchParams<{
    id?: string;
    deckName?: string;
  }>();
  const { getPlan, savePlan, getSideboardForDeck, deletePlan, plansForDeck } = useSideboard();
  const { matches } = useMatches();
  const existing = id ? getPlan(id) : undefined;
  const isEdit = Boolean(existing);

  const [deckName, setDeckName] = useState(
    existing?.deckName || (typeof deckParam === 'string' ? deckParam : '') || '',
  );
  const [vsLegend, setVsLegend] = useState(existing?.vsLegend ?? '');
  const [vsArchetype, setVsArchetype] = useState(existing?.vsArchetype ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [swaps, setSwaps] = useState<SideboardSwap[]>(
    existing?.swaps?.length ? existing.swaps : [{ outCard: '', inCard: '' }],
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setDeckName(existing.deckName);
    setVsLegend(existing.vsLegend);
    setVsArchetype(existing.vsArchetype);
    setNotes(existing.notes);
    setSwaps(
      existing.swaps.length > 0 ? existing.swaps : [{ outCard: '', inCard: '' }],
    );
  }, [existing]);

  const sideboardCards = useMemo(() => {
    return getSideboardForDeck(deckName)?.cards ?? [];
  }, [deckName, getSideboardForDeck]);

  const mainDeckCards = useMemo(() => {
    const names: string[] = [];
    for (const plan of plansForDeck(deckName)) {
      if (existing && plan.id === existing.id) continue;
      for (const s of plan.swaps) {
        if (s.outCard?.trim()) names.push(s.outCard);
      }
    }
    for (const s of swaps) {
      if (s.outCard?.trim()) names.push(s.outCard);
    }
    names.push(...knownOutCardsFromMatches(matches, deckName));
    return names;
  }, [deckName, plansForDeck, existing, swaps, matches]);

  const onSave = useCallback(async () => {
    const canonicalDeck = normalizeDeckName(deckName);
    if (!canonicalDeck) {
      Alert.alert('Deck required', 'Enter the deck this plan belongs to.');
      return;
    }
    if (!vsLegend.trim() && !vsArchetype.trim()) {
      Alert.alert(
        'Matchup required',
        'Enter an opponent legend and/or archetype.',
      );
      return;
    }
    const hasJunk = swaps.some(
      (s) =>
        ((s.outCard ?? '').trim().length > 0 && (s.outCard ?? '').trim().length < 2) ||
        ((s.inCard ?? '').trim().length > 0 && (s.inCard ?? '').trim().length < 2),
    );
    if (hasJunk) {
      Alert.alert('Card name too short', 'Card names need at least 2 characters.');
      return;
    }
    const cleaned = normalizeSwaps(swaps);
    if (cleaned.length === 0) {
      Alert.alert(
        'Add a swap',
        'Each swap needs both an OUT and an IN card (1-for-1).',
      );
      return;
    }
    if (cleaned.length > SIDEBOARD_MAX) {
      Alert.alert('Too many swaps', `Maximum ${SIDEBOARD_MAX} 1-for-1 swaps.`);
      return;
    }

    setSaving(true);
    try {
      await savePlan({
        id: existing?.id,
        deckName: canonicalDeck,
        vsLegend: vsLegend.trim(),
        vsArchetype: vsArchetype.trim(),
        swaps: cleaned,
        notes: notes.trim(),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }, [
    deckName,
    vsLegend,
    vsArchetype,
    swaps,
    notes,
    existing?.id,
    savePlan,
    router,
  ]);

  // Cancel | title | Save — never settings gear
  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit ? 'Edit Matchup Plan' : 'New Matchup Plan',
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={styles.headerBtnText}>Cancel</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={onSave}
          disabled={saving}
          hitSlop={8}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Save"
        >
          <Text
            style={[
              styles.headerBtnText,
              styles.headerSave,
              saving && styles.headerBtnDisabled,
            ]}
          >
            Save
          </Text>
        </Pressable>
      ),
    });
  }, [isEdit, navigation, onSave, router, saving]);

  const onDelete = () => {
    if (!existing) return;
    Alert.alert('Delete plan?', 'This cannot be undone on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePlan(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <SectionCard title="Matchup">
        <View>
          <FieldLabel>Your deck</FieldLabel>
          <TextField
            value={deckName}
            onChangeText={setDeckName}
            placeholder="e.g. Miracle Kennen"
          />
        </View>
        <View>
          <FieldLabel>vs (legend / archetype)</FieldLabel>
          <TextField
            value={vsLegend}
            onChangeText={setVsLegend}
            placeholder="Legend (optional)"
          />
          <View style={{ height: 10 }} />
          <TextField
            value={vsArchetype}
            onChangeText={setVsArchetype}
            placeholder="Archetype (e.g. Control)"
          />
        </View>
      </SectionCard>

      <SectionCard title={`Swaps (1-for-1)  ·  max ${SIDEBOARD_MAX}`}>
        <Text style={styles.hint}>
          Every OUT must have a matching IN. Counts stay equal by design.
        </Text>
        <SwapPairEditor
          swaps={swaps}
          onChange={setSwaps}
          max={SIDEBOARD_MAX}
          sideboardCards={sideboardCards}
          mainDeckCards={mainDeckCards}
        />
      </SectionCard>

      <SectionCard title="Notes" inset>
        <TextField
          value={notes}
          onChangeText={setNotes}
          placeholder="When to deviate, keep priorities…"
          multiline
        />
      </SectionCard>

      {/* Delete lives in detail only — no second Save (header owns Save) */}
      {isEdit ? (
        <PrimaryButton label="Delete plan" onPress={onDelete} variant="danger" />
      ) : null}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  headerBtn: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  headerSave: {
    color: colors.accent,
    fontWeight: '700',
  },
  headerBtnDisabled: {
    opacity: 0.45,
  },
});
