import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { deckLookupKey, normalizeDeckName } from '../utils/deckName';
import { TextField } from './Field';
import { Chip } from './Chip';

const MIN_CARD_LEN = 2;

function collapseTrim(raw: string): string {
  return (raw ?? '').trim().replace(/\s+/g, ' ');
}

function uniqTitleCase(names: string[]): string[] {
  const map = new Map<string, string>();
  for (const raw of names) {
    const n = normalizeDeckName(raw);
    if (collapseTrim(n).length < MIN_CARD_LEN) continue;
    const key = deckLookupKey(n);
    if (!map.has(key)) map.set(key, n);
  }
  return Array.from(map.values());
}

/**
 * Anti-typing card picker: chips first, optional "Other…" free text (min 2).
 */
export function CardPicker({
  options,
  value,
  onChange,
  placeholder = 'Card name',
  emptyHint = 'No known cards yet — use Other…',
  disabled,
  allowClear,
  label,
}: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  emptyHint?: string;
  disabled?: boolean;
  allowClear?: boolean;
  label?: string;
}) {
  const [otherOpen, setOtherOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const pool = useMemo(() => uniqTitleCase(options), [options]);
  const selectedKey = deckLookupKey(value);
  const shortInvalid =
    collapseTrim(draft).length > 0 && collapseTrim(draft).length < MIN_CARD_LEN;

  const pick = (name: string) => {
    if (disabled) return;
    const canon = normalizeDeckName(name);
    if (collapseTrim(canon).length < MIN_CARD_LEN) return;
    onChange(canon);
    setOtherOpen(false);
    setDraft('');
  };

  const commitOther = () => {
    const canon = normalizeDeckName(draft);
    if (collapseTrim(canon).length < MIN_CARD_LEN) return;
    onChange(canon);
    setOtherOpen(false);
    setDraft('');
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {pool.length === 0 && !otherOpen ? (
        <Text style={styles.emptyHint}>{emptyHint}</Text>
      ) : (
        <View style={styles.chipRow}>
          {pool.map((name) => {
            const key = deckLookupKey(name);
            const active = selectedKey === key && Boolean(selectedKey);
            return (
              <Chip
                key={key}
                label={name}
                active={active}
                onPress={() => pick(name)}
              />
            );
          })}
          {allowClear && value ? (
            <Chip
              label="Clear"
              quiet
              onPress={() => {
                if (disabled) return;
                onChange('');
                setOtherOpen(false);
                setDraft('');
              }}
            />
          ) : null}
        </View>
      )}

      {!disabled ? (
        otherOpen ? (
          <View style={styles.otherBlock}>
            <TextField
              value={draft}
              onChangeText={setDraft}
              placeholder={placeholder}
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
              setDraft(value && !pool.some((p) => deckLookupKey(p) === selectedKey) ? value : '');
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
          Selected: {normalizeDeckName(value)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  otherBlock: { gap: 8 },
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
    minHeight: 36,
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
});
