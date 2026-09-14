import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { elevation } from '../theme/elevation';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { CardArt } from './CardArt';
import { displayCardLabel, resolveCardQuery } from '../utils/cardResolve';
import { isCardCodeToken } from '../utils/deckName';
import { paCdnArtUrl } from '../utils/piltoverImport';

/**
 * Sideboard slot 01–10.
 * Filled: leading 48 art (placeholder monogram until Riot uri) + name + trailing X.
 * Empty: dashed row, no art.
 */
export function SlotTile({
  index,
  name,
  onPress,
  onClear,
  fuzzy,
  imageUrl: imageUrlProp,
}: {
  /** 0-based index; displayed as 01–10 */
  index: number;
  name?: string;
  onPress?: () => void;
  onClear?: () => void;
  /** Fuzzy catalog match — warn left bar + Matched ≈ meta */
  fuzzy?: boolean;
  /** Interim PA / Riot art */
  imageUrl?: string | null;
}) {
  const filled = Boolean(name?.trim());
  const label = String(index + 1).padStart(2, '0');
  const entry = filled ? resolveCardQuery(name!) : undefined;
  const raw = filled ? name!.trim() : '';
  const unresolved = filled && !entry?.name && isCardCodeToken(raw);
  const display = filled
    ? unresolved
      ? raw
      : entry?.name || displayCardLabel(name!)
    : '';
  const uri =
    (imageUrlProp && imageUrlProp.trim()) ||
    entry?.imageUrl ||
    (isCardCodeToken(raw) ? paCdnArtUrl(raw) : undefined) ||
    (entry?.code ? paCdnArtUrl(entry.code) : undefined) ||
    null;
  const artState = uri ? 'ready' as const : filled ? 'placeholder' as const : 'missing' as const;

  const content = (
    <View
      style={[
        styles.tile,
        filled ? styles.filled : styles.empty,
        fuzzy && styles.fuzzy,
      ]}
    >
      {fuzzy ? <View style={styles.fuzzyBar} /> : null}
      <Text style={[styles.index, filled && styles.indexFilled]}>{label}</Text>
      {filled ? (
        <>
          <CardArt
            size={spacing.artSlot}
            uri={uri}
            name={display}
            state={artState}
            warn={fuzzy}
          />
          <View style={styles.textCol}>
            <Text style={styles.name} numberOfLines={2}>
              {display}
            </Text>
            {unresolved ? (
              <Text style={[styles.meta, styles.metaResolving]} numberOfLines={1}>
                Resolving name…
              </Text>
            ) : fuzzy ? (
              <Text style={styles.meta} numberOfLines={1}>
                Matched ≈
              </Text>
            ) : entry?.code ? (
              <Text style={styles.metaQuiet} numberOfLines={1}>
                {entry.code}
              </Text>
            ) : null}
          </View>
          {onClear ? (
            <Pressable
              onPress={onClear}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${display}`}
              style={styles.clearHit}
            >
              <Ionicons name="close" size={18} color={colors.inactive} />
            </Pressable>
          ) : null}
        </>
      ) : (
        <Text style={styles.placeholder}>Empty</Text>
      )}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: spacing.rowMinH,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  empty: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderStyle: 'dashed',
  },
  filled: {
    ...elevation.e1,
  },
  fuzzy: {
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
  index: {
    color: colors.inactive,
    fontWeight: '700',
    fontSize: 12,
    width: 24,
    letterSpacing: 0.4,
  },
  indexFilled: {
    color: colors.textSecondary,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    ...typography.title,
  },
  meta: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  metaQuiet: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  metaResolving: {
    color: colors.textMuted,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  placeholder: {
    flex: 1,
    color: colors.inactive,
    ...typography.body,
  },
  clearHit: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
