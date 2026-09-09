import {
  PlanFollowed,
  SideboardSwap,
  normalizeSwaps,
} from '../types/sideboard';

export type DiffBucket = 'kept' | 'changed' | 'missing' | 'extra';

export interface DiffEntry {
  /** Primary swap for the row (plan for kept/changed/missing; actual for extra). */
  swap: SideboardSwap;
  /** When bucket is `changed`, the actual OUT→IN that replaced the plan. */
  actualSwap?: SideboardSwap;
  bucket: DiffBucket;
}

export interface SideboardDiff {
  /** True when a plan was selected (`fromPlanId`) — show plan-vs-actual buckets. */
  hasPlan: boolean;
  kept: SideboardSwap[];
  /** Same OUT card, different IN — plan + actual. */
  changed: { plan: SideboardSwap; actual: SideboardSwap }[];
  /** Planned but not present in actual. */
  missing: SideboardSwap[];
  /** In actual but not in plan (or all actuals when there was no plan). */
  extra: SideboardSwap[];
  /** Flat rows for table-friendly rendering (kept → changed → missing → extra). */
  entries: DiffEntry[];
  /** Suggested chip from the computed diff — never auto-applied silently. */
  suggestedFollowed: PlanFollowed;
  /** @deprecated Use `kept` — alias for older call sites. */
  followed: SideboardSwap[];
  /** @deprecated Use `missing`. */
  missed: SideboardSwap[];
}

function pairKey(swap: SideboardSwap): string {
  return `${swap.outCard.trim().toLowerCase()}→${swap.inCard.trim().toLowerCase()}`;
}

function outKey(swap: SideboardSwap): string {
  return swap.outCard.trim().toLowerCase();
}

/**
 * Order-insensitive multiset diff between planned and actual 1-for-1 swaps.
 * Exact OUT→IN matches → kept; same OUT different IN → changed; leftovers →
 * missing / extra. Duplicate pairs are matched one-for-one.
 */
export function diffSideboardSwaps(
  planned: SideboardSwap[] | undefined | null,
  actual: SideboardSwap[] | undefined | null,
  options?: { hasPlan?: boolean },
): SideboardDiff {
  const planSwaps = normalizeSwaps(planned ?? []);
  const actualSwaps = normalizeSwaps(actual ?? []);
  const hasPlan = options?.hasPlan ?? planSwaps.length > 0;

  if (!hasPlan) {
    return {
      hasPlan: false,
      kept: [],
      changed: [],
      missing: [],
      extra: actualSwaps,
      followed: [],
      missed: [],
      entries: actualSwaps.map((swap) => ({ swap, bucket: 'extra' as const })),
      suggestedFollowed: 'no_plan',
    };
  }

  const usedActual = new Set<number>();
  const kept: SideboardSwap[] = [];
  const changed: { plan: SideboardSwap; actual: SideboardSwap }[] = [];
  const missing: SideboardSwap[] = [];
  const unresolved: SideboardSwap[] = [];

  // Pass 1 — exact OUT→IN matches.
  for (const plan of planSwaps) {
    const key = pairKey(plan);
    const hitIndex = actualSwaps.findIndex(
      (swap, index) => !usedActual.has(index) && pairKey(swap) === key,
    );
    if (hitIndex >= 0) {
      kept.push(plan);
      usedActual.add(hitIndex);
    } else {
      unresolved.push(plan);
    }
  }

  // Pass 2 — same OUT, different IN → changed.
  for (const plan of unresolved) {
    const out = outKey(plan);
    const hitIndex = actualSwaps.findIndex(
      (swap, index) => !usedActual.has(index) && outKey(swap) === out,
    );
    if (hitIndex >= 0) {
      changed.push({ plan, actual: actualSwaps[hitIndex] });
      usedActual.add(hitIndex);
    } else {
      missing.push(plan);
    }
  }

  const extra: SideboardSwap[] = [];
  actualSwaps.forEach((swap, index) => {
    if (!usedActual.has(index)) extra.push(swap);
  });

  const entries: DiffEntry[] = [
    ...kept.map((swap) => ({ swap, bucket: 'kept' as const })),
    ...changed.map(({ plan, actual }) => ({
      swap: plan,
      actualSwap: actual,
      bucket: 'changed' as const,
    })),
    ...missing.map((swap) => ({ swap, bucket: 'missing' as const })),
    ...extra.map((swap) => ({ swap, bucket: 'extra' as const })),
  ];

  return {
    hasPlan: true,
    kept,
    changed,
    missing,
    extra,
    followed: kept,
    missed: missing,
    entries,
    suggestedFollowed: suggestPlanFollowed({
      hasPlan: true,
      followedCount: kept.length,
      changedCount: changed.length,
      missedCount: missing.length,
      extraCount: extra.length,
      planCount: planSwaps.length,
    }),
  };
}

export function suggestPlanFollowed(counts: {
  hasPlan: boolean;
  followedCount: number;
  missedCount: number;
  extraCount: number;
  planCount: number;
  changedCount?: number;
}): PlanFollowed {
  if (!counts.hasPlan) return 'no_plan';
  const changed = counts.changedCount ?? 0;
  if (
    counts.missedCount === 0 &&
    counts.extraCount === 0 &&
    changed === 0
  ) {
    return 'yes';
  }
  if (counts.followedCount === 0 && changed === 0) return 'no';
  return 'partial';
}

/**
 * Diff a logged session against its chosen plan.
 * No plan when `fromPlanId` is missing or `planFollowed === 'no_plan'`.
 */
export function diffSessionAgainstPlan(
  planSwaps: SideboardSwap[] | undefined | null,
  actualSwaps: SideboardSwap[] | undefined | null,
  opts?: { fromPlanId?: string; planFollowed?: PlanFollowed },
): SideboardDiff {
  const hasPlan =
    Boolean(opts?.fromPlanId) && opts?.planFollowed !== 'no_plan';
  return diffSideboardSwaps(hasPlan ? planSwaps : [], actualSwaps, { hasPlan });
}
