import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { CardArt } from './CardArt';
import { displayCardLabel, resolveCardQuery } from '../utils/cardResolve';
import { isCardCodeToken } from '../utils/deckName';
import { paCdnArtUrl } from '../utils/piltoverImport';

/** Main / deck list row — 40 art + title + meta + qty (Designer Soft QA). */
export function DeckCardRow({
  name,
  qty,
  code,
  catalogId,
  imageUrl: imageUrlProp,
  fuzzy,
}: {
  name: string;
  qty: number;
  code?: string;
  catalogId?: string;
  /** Interim PA / Riot art URL from deck entry */
  imageUrl?: string | null;
  fuzzy?: boolean;
}) {
  const entry = catalogId
    ? resolveCardQuery(catalogId) || resolveCardQuery(name)
    : resolveCardQuery(code || name);

  const codeValue =
    (code && code.trim()) ||
    (isCardCodeToken(name.trim()) ? name.trim() : undefined);

  const resolvedLabel = entry?.name
    ? entry.name
    : name.trim() && !isCardCodeToken(name.trim())
      ? displayCardLabel(name)
      : undefined;

  const unresolved = !resolvedLabel;
  const title = unresolved ? codeValue || name : resolvedLabel!;
  const meta = unresolved
    ? codeValue
      ? 'Resolving name…'
      : undefined
    : codeValue
      ? codeValue
      : fuzzy
        ? 'Matched ≈'
        : undefined;

  const uri =
    (imageUrlProp && imageUrlProp.trim()) ||
    entry?.imageUrl ||
    (codeValue ? paCdnArtUrl(codeValue) : undefined) ||
    null;
  const artName = unresolved ? codeValue || name : resolvedLabel!;

  return (
    <View style={[styles.row, fuzzy && styles.fuzzy]}>
      {fuzzy ? <View style={styles.fuzzyBar} /> : null}
      <CardArt
        size={spacing.artThumb}
        uri={uri}
        name={artName}
        state={uri ? 'ready' : 'placeholder'}
        warn={fuzzy}
      />
      <View style={styles.textCol}>
        <Text style={styles.name} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text
            style={[
              styles.meta,
              unresolved && styles.metaResolving,
              fuzzy && !unresolved && styles.metaFuzzy,
            ]}
            numberOfLines={1}
          >
            {meta}
          </Text>
        ) : null}
      </View>
      <Text style={styles.qty}>×{qty}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.chipGap,
    minHeight: spacing.artThumb + 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  fuzzy: {
    backgroundColor: colors.warningBg,
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  fuzzyBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.warning,
  },
  textCol: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    ...typography.body,
    fontWeight: '600',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  metaResolving: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  metaFuzzy: {
    color: colors.warning,
    fontWeight: '600',
  },
  qty: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
