import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { deckLookupKey, isCardCodeToken, normalizeDeckName } from '../utils/deckName';
import {
  displayCardLabel,
  resolveCardQuery,
} from '../utils/cardResolve';
import { TextField } from './Field';
import { CardArt } from './CardArt';
import { paCdnArtUrl } from '../utils/piltoverImport';

const MIN_CARD_LEN = 2;

function collapseTrim(raw: string): string {
  return (raw ?? '').trim().replace(/\s+/g, ' ');
}

function uniqTitleCase(names: string[]): string[] {
  const map = new Map<string, string>();
  for (const raw of names) {
    const n = displayCardLabel(raw) || normalizeDeckName(raw);
    if (collapseTrim(n).length < MIN_CARD_LEN) continue;
    const key = deckLookupKey(n);
    if (!map.has(key)) map.set(key, n);
  }
  return Array.from(map.values());
}

export type CardPickerOptionMeta = {
  imageUrl?: string | null;
  /** Main | SB */
  pool?: 'Main' | 'SB';
  qty?: number;
  /** Fuzzy catalog match */
  fuzzy?: boolean;
  /** Set code when option label is already a display name */
  code?: string | null;
};

/**
 * Designer P0 list picker — 56 art + name + meta; qty badge on art; minH 56.
 * EN: Search cards · No cards found · Matched ≈
 */
export function CardPicker({
  options,
  value,
  onChange,
  placeholder = 'Search cards',
  emptyHint = 'No cards found',
  disabled,
  allowClear,
  label,
  optionMeta,
}: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  emptyHint?: string;
  disabled?: boolean;
  allowClear?: boolean;
  label?: string;
  /** Optional Main/SB · qty + fuzzy flags keyed by lookup */
  optionMeta?: Record<string, CardPickerOptionMeta>;
}) {
  const [otherOpen, setOtherOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');

  const pool = useMemo(() => uniqTitleCase(options), [options]);
  const filtered = useMemo(() => {
    const q = deckLookupKey(query);
    if (!q) return pool;
    return pool.filter((n) => deckLookupKey(n).includes(q));
  }, [pool, query]);

  const selectedKey = deckLookupKey(value);
  const shortInvalid =
    collapseTrim(draft).length > 0 && collapseTrim(draft).length < MIN_CARD_LEN;

  const pick = (name: string) => {
    if (disabled) return;
    const resolved = resolveCardQuery(name);
    const canon = resolved?.name || normalizeDeckName(name);
    if (collapseTrim(canon).length < MIN_CARD_LEN) return;
    onChange(canon);
    setOtherOpen(false);
    setDraft('');
    setQuery('');
  };

  const commitOther = () => {
    const resolved = resolveCardQuery(draft);
    const canon = resolved?.name || normalizeDeckName(draft);
    if (collapseTrim(canon).length < MIN_CARD_LEN) return;
    onChange(canon);
    setOtherOpen(false);
    setDraft('');
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {!disabled && !otherOpen ? (
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          autoCapitalize="none"
        />
      ) : null}

      {filtered.length === 0 && !otherOpen ? (
        <Text style={styles.emptyHint}>{emptyHint}</Text>
      ) : (
        <View style={styles.list}>
          {filtered.map((name) => {
            const key = deckLookupKey(name);
            const active = selectedKey === key && Boolean(selectedKey);
            const meta = optionMeta?.[key];
            const codeHint =
              (meta?.code && String(meta.code).trim()) ||
              (isCardCodeToken(name.trim()) ? name.trim() : undefined);
            const entry =
              resolveCardQuery(codeHint || name) || resolveCardQuery(name);
            const primary =
              entry?.name ||
              (!isCardCodeToken(name.trim())
                ? displayCardLabel(name)
                : name);
            const codeValue =
              (entry?.code && entry.code.trim()) || codeHint || undefined;
            const uri = entry?.imageUrl ?? null;
            const fuzzy = Boolean(meta?.fuzzy);
            const qty = meta?.qty;
            const poolLabel = meta?.pool;
            const artUri =
              uri ||
              meta?.imageUrl ||
              (codeValue ? paCdnArtUrl(codeValue) : undefined) ||
              null;
            const metaBits = fuzzy
              ? 'Matched ≈'
              : [poolLabel, typeof qty === 'number' ? `×${qty}` : null, codeValue]
                  .filter(Boolean)
                  .join(' · ') || ' ';
            return (
              <Pressable
                key={key}
                onPress={() => pick(name)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.row,
                  active && styles.rowActive,
                  fuzzy && styles.rowFuzzy,
                  pressed && styles.pressed,
                ]}
              >
                {fuzzy ? <View style={styles.fuzzyBar} /> : null}
                <CardArt
                  size={spacing.artPicker}
                  uri={artUri}
                  name={primary}
                  state={
                    artUri
                      ? 'ready'
                      : isCardCodeToken(String(primary).trim())
                        ? 'loading'
                        : 'placeholder'
                  }
                  qty={qty}
                  warn={fuzzy}
                />
                <View style={styles.textCol}>
                  <Text
                    style={[styles.rowName, active && styles.rowNameActive]}
                    numberOfLines={1}
                  >
                    {primary}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {metaBits}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {allowClear && value ? (
            <Pressable
              onPress={() => {
                if (disabled) return;
                onChange('');
                setOtherOpen(false);
                setDraft('');
              }}
              style={({ pressed }) => [styles.row, styles.clearRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Clear selection"
            >
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {!disabled ? (
        otherOpen ? (
          <View style={styles.otherBlock}>
            <TextField
              value={draft}
              onChangeText={setDraft}
              placeholder="Card name"
              invalid={shortInvalid}
              onBlur={commitOther}
            />
            <View style={styles.otherActions}>
              <Pressable
                onPress={commitOther}
                disabled={collapseTrim(draft).length < MIN_CARD_LEN}
                style={styles.otherBtn}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.otherBtnText,
                    collapseTrim(draft).length < MIN_CARD_LEN &&
                      styles.otherBtnDisabled,
                  ]}
                >
                  Use
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setOtherOpen(false);
                  setDraft('');
                }}
                style={styles.otherBtn}
                accessibilityRole="button"
              >
                <Text style={styles.otherCancel}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              setOtherOpen(true);
              setDraft(
                value && !pool.some((p) => deckLookupKey(p) === selectedKey)
                  ? value
                  : '',
              );
            }}
            style={styles.otherLink}
            accessibilityRole="button"
          >
            <Text style={styles.otherLinkText}>Other…</Text>
          </Pressable>
        )
      ) : null}

      {value ? (
        <Text style={styles.selected} numberOfLines={1}>
          Selected: {displayCardLabel(value)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.chipGap },
  label: {
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
  list: { gap: 4 },
  row: {
    minHeight: spacing.artPicker,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  rowActive: {
    backgroundColor: colors.accentSoft,
  },
  rowFuzzy: {
    backgroundColor: colors.warningBg,
  },
  fuzzyBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.warning,
  },
  textCol: { flex: 1, gap: 2 },
  rowName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowNameActive: {
    color: colors.accent,
  },
  rowMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  clearRow: {
    justifyContent: 'center',
  },
  clearText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  otherBlock: { gap: spacing.chipGap },
  otherActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  otherBtn: {
    minHeight: spacing.hitTarget,
    justifyContent: 'center',
  },
  otherBtnText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 15,
  },
  otherBtnDisabled: { opacity: 0.4 },
  otherCancel: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 15,
  },
  otherLink: {
    alignSelf: 'flex-start',
    minHeight: spacing.chipMinH,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  otherLinkText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  selected: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
