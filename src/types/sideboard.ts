export const SIDEBOARD_MAX = 10;

export type PlanFollowed = 'yes' | 'partial' | 'no' | 'no_plan';

export const PLAN_FOLLOWED_OPTIONS: PlanFollowed[] = [
  'yes',
  'partial',
  'no',
  'no_plan',
];

export const PLAN_FOLLOWED_LABELS: Record<PlanFollowed, string> = {
  yes: 'Yes',
  partial: 'Partial',
  no: 'No',
  no_plan: 'No plan',
};

export interface SideboardSwap {
  outCard: string;
  inCard: string;
}

export interface DeckSideboard {
  id: string;
  deckName: string;
  cards: string[];
  updatedAt: string;
}

export interface MatchupPlan {
  id: string;
  deckName: string;
  vsLegend: string;
  vsArchetype: string;
  swaps: SideboardSwap[];
  notes: string;
  updatedAt: string;
  createdAt: string;
}

export interface SideboardSession {
  fromPlanId?: string;
  actualSwaps: SideboardSwap[];
  planFollowed: PlanFollowed;
  /** Always false for Game 1; true for G2/G3 when sideboarding is allowed. */
  sideboardingAllowed: boolean;
}

export function emptySideboardSession(allowed: boolean): SideboardSession {
  return {
    actualSwaps: [],
    planFollowed: 'no_plan',
    sideboardingAllowed: allowed,
  };
}

export function isValidSwapPair(swap: SideboardSwap): boolean {
  const out = (swap.outCard ?? '').trim();
  const inn = (swap.inCard ?? '').trim();
  // Reject 1-char junk like "Ff"
  return out.length >= 2 && inn.length >= 2;
}

export function clampSideboardCards(cards: string[]): string[] {
  return cards
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, SIDEBOARD_MAX);
}

export function normalizeSwaps(swaps: SideboardSwap[]): SideboardSwap[] {
  return swaps
    .map((s) => ({
      outCard: (s.outCard ?? '').trim().replace(/\s+/g, ' '),
      inCard: (s.inCard ?? '').trim().replace(/\s+/g, ' '),
    }))
    .filter(isValidSwapPair)
    .slice(0, SIDEBOARD_MAX);
}

export function planTitle(plan: {
  vsLegend?: string;
  vsArchetype?: string;
}): string {
  const vs =
    (plan.vsArchetype ?? '').trim() ||
    (plan.vsLegend ?? '').trim() ||
    'Unknown matchup';
  return `vs ${vs}`;
}

export function planSubtitle(plan: {
  vsLegend?: string;
  vsArchetype?: string;
  swaps: { outCard: string; inCard: string }[];
}): string {
  const parts: string[] = [];
  const legend = (plan.vsLegend ?? '').trim();
  const arch = (plan.vsArchetype ?? '').trim();
  if (legend) parts.push(legend);
  if (arch && arch !== legend) parts.push(arch);
  const swaps = `${plan.swaps.length} swap${plan.swaps.length === 1 ? '' : 's'}`;
  return parts.length ? `${parts.join(' · ')} · ${swaps}` : swaps;
}
