import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SideboardSwap } from '../types/sideboard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { TextField } from './Field';
import { deckLookupKey, normalizeDeckName } from '../utils/deckName';

const MIN_CARD_LEN = 2;

function collapseTrim(raw: string): string {
  return (raw ?? '').trim().replace(/\s+/g, ' ');
}

function isUsableCardName(raw: string): boolean {
  return collapseTrim(raw).length >= MIN_CARD_LEN;
}

function uniqTitleCase(names: string[]): string[] {
  const map = new Map<string, string>();
  for (const raw of names) {
    const n = normalizeDeckName(raw);
    if (!isUsableCardName(n)) continue;
    const key = deckLookupKey(n);
    if (!map.has(key)) map.set(key, n);
  }
  return Array.from(map.values());
}

export function SwapPairEditor({
  swaps,
  onChange,
  max = 10,
  disabled,
  /** Sideboard pool — chips fill IN. */
  sideboardCards,
  /** Main-deck pool — chips fill OUT. */
  mainDeckCards,
}: {
  swaps: SideboardSwap[];
  onChange: (swaps: SideboardSwap[]) => void;
  max?: number;
  disabled?: boolean;
  sideboardCards?: string[];
  mainDeckCards?: string[];
}) {
  /** Session additions via Other… for OUT. */
  const [extraOut, setExtraOut] = useState<string[]>([]);
  const [selectedOutKey, setSelectedOutKey] = useState<string | null>(null);
  const [selectedInKey, setSelectedInKey] = useState<string | null>(null);
  const [otherOutOpen, setOtherOutOpen] = useState(false);
  const [otherInOpen, setOtherInOpen] = useState(false);
  const [otherOutDraft, setOtherOutDraft] = useState('');
  const [otherInDraft, setOtherInDraft] = useState('');

  const usedOutKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const s of swaps) {
      const k = deckLookupKey(s.outCard);
      if (k) keys.add(k);
    }
    return keys;
  }, [swaps]);

  const usedInKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const s of swaps) {
      const k = deckLookupKey(s.inCard);
      if (k) keys.add(k);
    }
    return keys;
  }, [swaps]);

  const outPool = useMemo(
    () =>
      uniqTitleCase([
        ...(mainDeckCards ?? []),
        ...extraOut,
        ...swaps.map((s) => s.outCard),
      ]),
    [mainDeckCards, extraOut, swaps],
  );

  const inPool = useMemo(
    () =>
      uniqTitleCase([
        ...(sideboardCards ?? []),
        ...swaps.map((s) => s.inCard),
      ]),
    [sideboardCards, swaps],
  );


  const remove = (index: number) => {
    onChange(swaps.filter((_, i) => i !== index));
  };

  const add = () => {
    if (disabled || swaps.length >= max) return;
    onChange([...swaps, { outCard: '', inCard: '' }]);
  };

  const rememberOut = (raw: string) => {
    const n = normalizeDeckName(raw);
    if (!isUsableCardName(n)) return;
    setExtraOut((prev) =>
      prev.some((p) => deckLookupKey(p) === deckLookupKey(n))
        ? prev
        : [...prev, n],
    );
  };


  const applyOutChip = (name: string) => {
    if (disabled) return;
    const canon = normalizeDeckName(name);
    if (!isUsableCardName(canon)) return;
    const next = swaps.length > 0 ? [...swaps] : [{ outCard: '', inCard: '' }];
    let index = next.findIndex((s) => !collapseTrim(s.outCard));
    if (index < 0) index = next.length - 1;
    if (index < 0) return;
    next[index] = { ...next[index], outCard: canon };
    onChange(next);
    rememberOut(canon);
    setSelectedOutKey(deckLookupKey(canon));
    setOtherOutOpen(false);
    setOtherOutDraft('');
  };

  const applyInChip = (name: string) => {
    if (disabled) return;
    const canon = normalizeDeckName(name);
    if (!isUsableCardName(canon)) return;
    const next = swaps.length > 0 ? [...swaps] : [{ outCard: '', inCard: '' }];
    let index = next.findIndex((s) => !collapseTrim(s.inCard));
    if (index < 0) index = next.length - 1;
    if (index < 0) return;
    next[index] = { ...next[index], inCard: canon };
    onChange(next);
    setSelectedInKey(deckLookupKey(canon));
    setOtherInOpen(false);
    setOtherInDraft('');
  };

  const commitOtherOut = () => {
    const canon = normalizeDeckName(otherOutDraft);
    if (!isUsableCardName(canon)) return;
    applyOutChip(canon);
  };

  const commitOtherIn = () => {
    const canon = normalizeDeckName(otherInDraft);
    if (!isUsableCardName(canon)) return;
    applyInChip(canon);
  };

  return (
    <View style={styles.wrap}>
      {swaps.map((swap, index) => (
        <View key={`swap-${index}`} style={styles.row}>
          <View style={styles.cols}>
            <View style={styles.col}>
              <Text style={styles.colLabel}>OUT</Text>
              <Text
                style={[
                  styles.selectedValue,
                  !collapseTrim(swap.outCard) && styles.selectedPlaceholder,
                ]}
                numberOfLines={2}
              >
                {collapseTrim(swap.outCard)
                  ? normalizeDeckName(swap.outCard)
                  : 'Pick from pool'}
              </Text>
            </View>
            <View style={styles.arrow}>
              <Ionicons
                name="swap-horizontal"
                size={18}
                color={colors.textMuted}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.colLabel}>IN</Text>
              <Text
                style={[
                  styles.selectedValue,
                  !collapseTrim(swap.inCard) && styles.selectedPlaceholder,
                ]}
                numberOfLines={2}
              >
                {collapseTrim(swap.inCard)
                  ? normalizeDeckName(swap.inCard)
                  : 'Pick from SB'}
              </Text>
            </View>
            {!disabled ? (
              <Pressable
                onPress={() => remove(index)}
                style={styles.remove}
                accessibilityRole="button"
                accessibilityLabel="Remove swap"
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            ) : (
              <View style={styles.removeSpacer} />
            )}
          </View>
        </View>
      ))}

      <View style={styles.poolBlock}>
        <Text style={styles.poolLabel}>OUT FROM MAIN</Text>
        {outPool.length === 0 && !otherOutOpen ? (
          <Text style={styles.emptyHint}>
            No main-pool cards yet — use Other… or build plans first.
          </Text>
        ) : (
          <View style={styles.chipRow}>
            {outPool.map((name) => {
              const key = deckLookupKey(name);
              const used = usedOutKeys.has(key);
              const selected = selectedOutKey === key;
              return (
                <Pressable
                  key={`out-${key}`}
                  onPress={() => applyOutChip(name)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.poolChip,
                    selected && styles.poolChipSelected,
                    used && !selected && styles.poolChipUsed,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.poolChipText,
                      selected && styles.poolChipTextSelected,
                      used && !selected && styles.poolChipTextUsed,
                    ]}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {!disabled ? (
          otherOutOpen ? (
            <View style={styles.otherBlock}>
              <TextField
                value={otherOutDraft}
                onChangeText={setOtherOutDraft}
                placeholder="Main deck card"
                invalid={
                  collapseTrim(otherOutDraft).length > 0 &&
                  collapseTrim(otherOutDraft).length < MIN_CARD_LEN
                }
                onBlur={commitOtherOut}
              />
              <View style={styles.otherActions}>
                <Pressable onPress={commitOtherOut} accessibilityRole="button">
                  <Text style={styles.otherLinkText}>Use</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setOtherOutOpen(false);
                    setOtherOutDraft('');
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.otherCancel}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setOtherOutOpen(true)}
              style={styles.otherLink}
              accessibilityRole="button"
            >
              <Text style={styles.otherLinkText}>Other…</Text>
            </Pressable>
          )
        ) : null}
      </View>

      <View style={styles.poolBlock}>
        <Text style={styles.poolLabel}>From sideboard</Text>
        {inPool.length === 0 && !otherInOpen ? (
          <Text style={styles.emptyHint}>
            Add sideboard cards on the Sideboard tab to quick-pick IN, or use
            Other….
          </Text>
        ) : (
          <View style={styles.chipRow}>
            {inPool.map((name) => {
              const key = deckLookupKey(name);
              const used = usedInKeys.has(key);
              const selected = selectedInKey === key;
              return (
                <Pressable
                  key={`in-${key}`}
                  onPress={() => applyInChip(name)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.poolChip,
                    selected && styles.poolChipSelected,
                    used && !selected && styles.poolChipUsed,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.poolChipText,
                      selected && styles.poolChipTextSelected,
                      used && !selected && styles.poolChipTextUsed,
                    ]}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {!disabled ? (
          otherInOpen ? (
            <View style={styles.otherBlock}>
              <TextField
                value={otherInDraft}
                onChangeText={setOtherInDraft}
                placeholder="Sideboard card"
                invalid={
                  collapseTrim(otherInDraft).length > 0 &&
                  collapseTrim(otherInDraft).length < MIN_CARD_LEN
                }
                onBlur={commitOtherIn}
              />
              <View style={styles.otherActions}>
                <Pressable onPress={commitOtherIn} accessibilityRole="button">
                  <Text style={styles.otherLinkText}>Use</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setOtherInOpen(false);
                    setOtherInDraft('');
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.otherCancel}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setOtherInOpen(true)}
              style={styles.otherLink}
              accessibilityRole="button"
            >
              <Text style={styles.otherLinkText}>Other…</Text>
            </Pressable>
          )
        ) : null}
      </View>

      {!disabled && swaps.length < max ? (
        <Pressable
          onPress={add}
          style={styles.addBtn}
          accessibilityRole="button"
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
          <Text style={styles.addText}>
            Add 1-for-1 swap ({swaps.length}/{max})
          </Text>
        </Pressable>
      ) : null}

      {swaps.length >= max ? (
        <Text style={styles.hint}>Maximum {max} swaps (sideboard size).</Text>
      ) : null}
    </View>
  );
}

/** Reject 1-char junk like `Ff`. */
export function isJunkCardName(raw: string): boolean {
  const t = collapseTrim(raw);
  return t.length > 0 && t.length < MIN_CARD_LEN;
}

export function isValidCardName(raw: string): boolean {
  return isUsableCardName(raw);
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  row: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cols: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  col: { flex: 1 },
  colLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  selectedValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    minHeight: 36,
  },
  selectedPlaceholder: {
    color: colors.textMuted,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  arrow: {
    width: 24,
    alignItems: 'center',
  },
  remove: {
    width: spacing.hitTarget,
    height: spacing.hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeSpacer: {
    width: spacing.hitTarget,
    height: spacing.hitTarget,
  },
  poolBlock: { gap: 8 },
  poolLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  poolChip: {
    minHeight: spacing.hitTarget,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolChipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  poolChipUsed: {
    opacity: 0.55,
  },
  poolChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  poolChipTextSelected: {
    color: colors.accent,
    opacity: 1,
  },
  poolChipTextUsed: {
    color: colors.textMuted,
  },
  pressed: { opacity: 0.85 },
  otherBlock: { gap: 8 },
  otherActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  otherLink: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
  },
  otherLinkText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  otherCancel: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 4,
  },
  addText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 15,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
