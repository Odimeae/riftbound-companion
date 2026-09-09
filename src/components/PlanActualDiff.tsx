import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  PLAN_FOLLOWED_LABELS,
  PlanFollowed,
  SideboardSwap,
  normalizeSwaps,
} from '../types/sideboard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { DiffKind, DiffRow } from './DiffRow';
import { LockBanner } from './LockBanner';
import {
  DiffBucket,
  DiffEntry,
  SideboardDiff,
  diffSessionAgainstPlan,
  diffSideboardSwaps,
} from '../utils/sideboardDiff';

const BUCKET_ORDER: DiffBucket[] = ['kept', 'changed', 'missing', 'extra'];

const BUCKET_LABEL: Record<DiffBucket, string> = {
  kept: 'Kept',
  changed: 'Changed',
  missing: 'Missing',
  extra: 'Extra',
};

const BUCKET_COLOR: Record<DiffBucket, string> = {
  kept: colors.win,
  changed: colors.warning,
  missing: colors.loss,
  extra: colors.inactive,
};

export function PlanActualDiff({
  planned,
  actual,
  fromPlanId,
  planFollowed,
  planLabel,
  compact,
  showG1Note,
  /** When false, skip rendering the table (e.g. Compare with no actual). */
  showDiff = true,
}: {
  planned?: SideboardSwap[] | null;
  actual?: SideboardSwap[] | null;
  fromPlanId?: string;
  planFollowed?: PlanFollowed;
  planLabel?: string;
  compact?: boolean;
  /** Show G1 locked / Changes after game 1 note when appropriate */
  showG1Note?: boolean;
  showDiff?: boolean;
}) {
  const diff: SideboardDiff =
    fromPlanId !== undefined || planFollowed !== undefined
      ? diffSessionAgainstPlan(planned, actual, { fromPlanId, planFollowed })
      : diffSideboardSwaps(planned, actual);

  const summary = buildSummaryLine(diff);
  const showSuggestion =
    diff.hasPlan &&
    planFollowed !== undefined &&
    planFollowed !== diff.suggestedFollowed;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {diff.hasPlan ? 'Plan vs actual' : 'Actual swaps'}
        </Text>
        {planLabel && diff.hasPlan ? (
          <Text style={styles.planLabel} numberOfLines={1}>
            {planLabel}
          </Text>
        ) : null}
      </View>

      {showG1Note ? (
        <LockBanner title="G1 locked" meta="Changes after game 1" />
      ) : null}

      {!diff.hasPlan ? (
        <Text style={styles.noPlanNote}>
          No plan selected — showing actual swaps only.
        </Text>
      ) : null}

      {diff.hasPlan &&
      fromPlanId &&
      normalizeSwaps(planned ?? []).length === 0 ? (
        <Text style={styles.noPlanNote}>
          Linked plan has no swaps (or was deleted) — actuals show as extra.
        </Text>
      ) : null}

      {summary ? <Text style={styles.summary}>{summary}</Text> : null}

      {showSuggestion ? (
        <Text style={styles.suggestion}>
          Diff suggests:{' '}
          <Text style={styles.suggestionStrong}>
            {PLAN_FOLLOWED_LABELS[diff.suggestedFollowed]}
          </Text>
          {planFollowed ? (
            <> (you marked {PLAN_FOLLOWED_LABELS[planFollowed]})</>
          ) : null}
        </Text>
      ) : null}

      {!showDiff ? null : diff.entries.length === 0 ? (
        <Text style={styles.empty}>No swaps recorded.</Text>
      ) : (
        <View style={styles.table}>
          {BUCKET_ORDER.map((bucket) => (
            <BucketSection
              key={bucket}
              bucket={bucket}
              entries={diff.entries.filter((e) => e.bucket === bucket)}
              overrideLabel={
                !diff.hasPlan && bucket === 'extra' ? 'Actual' : undefined
              }
            />
          ))}
        </View>
      )}
    </View>
  );
}

function BucketSection({
  bucket,
  entries,
  overrideLabel,
}: {
  bucket: DiffBucket;
  entries: DiffEntry[];
  overrideLabel?: string;
}) {
  if (entries.length === 0) return null;
  const color = BUCKET_COLOR[bucket];
  return (
    <View style={styles.bucket}>
      <View style={styles.bucketHeader}>
        <Text style={[styles.bucketTitle, { color }]}>
          {overrideLabel ?? BUCKET_LABEL[bucket]}
        </Text>
        <Text style={[styles.bucketCount, { color }]}>{entries.length}</Text>
      </View>
      {entries.map((entry, idx) => (
        <DiffRow
          key={`${bucket}-${idx}-${entry.swap.outCard}-${entry.swap.inCard}`}
          swap={entry.swap}
          kind={entry.bucket as DiffKind}
          actualSwap={entry.actualSwap}
        />
      ))}
    </View>
  );
}

function buildSummaryLine(diff: SideboardDiff): string {
  if (!diff.hasPlan) {
    return diff.extra.length
      ? `${diff.extra.length} swap${diff.extra.length === 1 ? '' : 's'}`
      : '';
  }
  const parts: string[] = [];
  if (diff.kept.length) parts.push(`${diff.kept.length} kept`);
  if (diff.changed.length) parts.push(`${diff.changed.length} changed`);
  if (diff.missing.length) parts.push(`${diff.missing.length} missing`);
  if (diff.extra.length) parts.push(`${diff.extra.length} extra`);
  if (parts.length === 0) return 'Plan had no swaps and none were logged.';
  return parts.join(' · ');
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    marginTop: 6,
  },
  wrapCompact: {
    marginTop: 4,
  },
  header: {
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  planLabel: {
    color: colors.textSecondary,
    ...typography.meta,
    fontWeight: '600',
  },
  noPlanNote: {
    color: colors.inactive,
    ...typography.meta,
    lineHeight: 18,
  },
  summary: {
    color: colors.textSecondary,
    ...typography.meta,
    fontWeight: '600',
  },
  suggestion: {
    color: colors.inactive,
    fontSize: 12,
    lineHeight: 17,
  },
  suggestionStrong: {
    color: colors.text,
    fontWeight: '700',
  },
  empty: {
    color: colors.inactive,
    fontSize: 14,
  },
  table: {
    gap: 0,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  bucket: {
    gap: 0,
  },
  bucketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.inset,
  },
  bucketTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bucketCount: {
    fontSize: 12,
    fontWeight: '700',
  },
});
