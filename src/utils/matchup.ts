import { deckLookupKey, normalizeDeckName } from './deckName';

/** Display label for a plan matchup (legend preferred, then archetype). */
export function planOppLabel(plan: {
  vsLegend?: string;
  vsArchetype?: string;
}): string {
  return (
    normalizeDeckName(plan.vsLegend ?? '') ||
    normalizeDeckName(plan.vsArchetype ?? '') ||
    ''
  );
}

/** Display label for a match opponent (legend preferred, then deck). */
export function matchOppLabel(match: {
  opponentLegend?: string;
  opponentDeck?: string;
}): string {
  return (
    normalizeDeckName(match.opponentLegend ?? '') ||
    normalizeDeckName(match.opponentDeck ?? '') ||
    ''
  );
}

/**
 * True when plan vsLegend/vsArchetype aligns with match opponent legend/deck.
 * Cross-field matches allowed (legend vs deck name).
 */
export function planMatchesOpponent(
  plan: { vsLegend?: string; vsArchetype?: string },
  opponentLegend: string,
  opponentDeck: string,
): boolean {
  const leg = deckLookupKey(opponentLegend);
  const deck = deckLookupKey(opponentDeck);
  const vsL = deckLookupKey(plan.vsLegend ?? '');
  const vsA = deckLookupKey(plan.vsArchetype ?? '');
  if (!leg && !deck) return true;
  if (!vsL && !vsA) return true;
  if (leg && (leg === vsL || leg === vsA)) return true;
  if (deck && (deck === vsA || deck === vsL)) return true;
  return false;
}

/**
 * Warn copy when attached plan opp ≠ match opp.
 * e.g. "Plan is for vs Ornn — this match is vs Lillia"
 */
export function planMatchupMismatchMessage(
  plan: { vsLegend?: string; vsArchetype?: string },
  match: { opponentLegend?: string; opponentDeck?: string },
): string | null {
  const planOpp = planOppLabel(plan);
  const matchOpp = matchOppLabel(match);
  if (!planOpp || !matchOpp) return null;
  if (
    planMatchesOpponent(
      plan,
      match.opponentLegend ?? '',
      match.opponentDeck ?? '',
    )
  ) {
    return null;
  }
  return `Plan is for vs ${planOpp} — this match is vs ${matchOpp}`;
}
