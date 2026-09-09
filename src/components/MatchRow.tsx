import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Match,
  MistakeTag,
  MISTAKE_TAG_LABELS,
  displayTitle,
  noteOneLiner,
} from '../types/match';
import { WlPill } from './WlPill';
import { Chip } from './Chip';
import { formatShortDate } from '../utils/stats';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

/**
 * First non-empty freeform note — italic preview line only.
 * Never passed into meta / title / champions.
 */
function notePreview(match: Match): string | undefined {
  const line = noteOneLiner(match.note);
  return line || undefined;
}

/**
 * List meta pipeline — date · event · format ONLY.
 * Notes, legends, decks, tags must never enter this string.
 */
export function matchListMeta(match: Match): string {
  return [formatShortDate(match.date), match.eventType, match.format].join(
    ' · ',
  );
}

function rowMistakeTags(match: Match): MistakeTag[] {
  return match.note?.mistakeTags?.slice(0, 2) ?? [];
}

/**
 * Flat MatchRow — WlPill | `{deck} vs {opp}` / meta / notes / quiet tags / chevron.
 * Notes stay on their own italic line (never inlined into meta).
 */
export function MatchRow({
  match,
  onPress,
  variant = 'flat',
}: {
  match: Match;
  onPress: () => void;
  /** `flat` is P0 default; `card` kept for rare elevated contexts */
  variant?: 'card' | 'flat';
}) {
  const flat = variant === 'flat';
  const tags = rowMistakeTags(match);
  const notes = notePreview(match);
  const meta = matchListMeta(match);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        flat ? styles.rowFlat : styles.rowCard,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
    >
      <WlPill outcome={match.outcome} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {displayTitle(match)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
        {notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            {notes}
          </Text>
        ) : null}
        {tags.length > 0 ? (
          <View style={styles.tags}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={MISTAKE_TAG_LABELS[tag]}
                compact
                quiet
              />
            ))}
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inactive} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: spacing.radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
    minHeight: spacing.rowMinH,
  },
  rowFlat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 0,
    minHeight: spacing.rowMinH,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  pressed: {
    opacity: 0.85,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    ...typography.title,
  },
  meta: {
    color: colors.textSecondary,
    ...typography.meta,
  },
  notes: {
    color: colors.textMuted,
    ...typography.meta,
    fontStyle: 'italic',
    marginTop: 2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
});
