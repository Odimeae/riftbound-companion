import { Match } from '../types/match';
import { deckLookupKey, normalizeDeckName } from './deckName';

export function winRate(matches: Match[]): number | null {
  if (matches.length === 0) return null;
  const wins = matches.filter((m) => m.outcome === 'Win').length;
  return wins / matches.length;
}

export function winLossLabel(matches: Match[]): string {
  const wins = matches.filter((m) => m.outcome === 'Win').length;
  const losses = matches.length - wins;
  return `${wins}–${losses}`;
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export type WinRateBucket = {
  label: string;
  rate: number;
  count: number;
  wins: number;
  losses: number;
};

function bucketize(
  matches: Match[],
  keyFn: (m: Match) => { key: string; label: string },
): WinRateBucket[] {
  const grouped = new Map<string, { label: string; items: Match[] }>();
  for (const match of matches) {
    const { key, label } = keyFn(match);
    const bucket = grouped.get(key) ?? { label, items: [] };
    bucket.items.push(match);
    grouped.set(key, bucket);
  }

  return Array.from(grouped.values())
    .map(({ label, items }) => {
      const wins = items.filter((m) => m.outcome === 'Win').length;
      return {
        label,
        rate: wins / items.length,
        count: items.length,
        wins,
        losses: items.length - wins,
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });
}

export function winRateByDeck(
  matches: Match[],
): { deck: string; rate: number; count: number; wins: number; losses: number }[] {
  return bucketize(matches, (match) => {
    const label = normalizeDeckName(match.ownDeck) || 'Unnamed Deck';
    const key = deckLookupKey(label) || 'unnamed deck';
    return { key, label };
  }).map((b) => ({
    deck: b.label,
    rate: b.rate,
    count: b.count,
    wins: b.wins,
    losses: b.losses,
  }));
}

/** WR grouped by opponent legend (required field on log). */
export function winRateByOpponentLegend(matches: Match[]): WinRateBucket[] {
  return bucketize(
    matches.filter((m) => normalizeDeckName(m.opponentLegend)),
    (match) => {
      const label = normalizeDeckName(match.opponentLegend) || 'Unknown';
      const key = deckLookupKey(label) || 'unknown';
      return { key, label };
    },
  );
}

/** True when any game has actual sideboard swaps logged. */
export function matchUsedSideboard(match: Match): boolean {
  return match.games.some((g) => (g.sideboard?.actualSwaps?.length ?? 0) > 0);
}

/**
 * WR with sideboard used vs G1-only / Bo1 (no swaps).
 * - sideboardUsed: any actualSwaps length > 0
 * - g1OnlyOrBo1: format Bo1 OR no swaps logged
 */
export function winRateBySideboardUsage(matches: Match[]): {
  sideboardUsed: WinRateBucket | null;
  g1OnlyOrBo1: WinRateBucket | null;
} {
  const used = matches.filter(matchUsedSideboard);
  const unused = matches.filter((m) => !matchUsedSideboard(m));

  const toBucket = (label: string, items: Match[]): WinRateBucket | null => {
    if (items.length === 0) return null;
    const wins = items.filter((m) => m.outcome === 'Win').length;
    return {
      label,
      rate: wins / items.length,
      count: items.length,
      wins,
      losses: items.length - wins,
    };
  };

  return {
    sideboardUsed: toBucket('Sideboard used', used),
    g1OnlyOrBo1: toBucket('G1-only / Bo1', unused),
  };
}

/** Recent unique opponent legends (most recent first). */
export function recentOpponentLegends(
  matches: Match[],
  limit = 8,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    const label = normalizeDeckName(m.opponentLegend);
    if (!label) continue;
    const key = deckLookupKey(label);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= limit) break;
  }
  return out;
}

/** Known own-deck names from matches + optional extra names (sideboards). */
export function knownOwnDecks(
  matches: Match[],
  extras: string[] = [],
): string[] {
  const map = new Map<string, string>();
  for (const name of extras) {
    const label = normalizeDeckName(name);
    if (!label) continue;
    map.set(deckLookupKey(label), label);
  }
  for (const m of matches) {
    const label = normalizeDeckName(m.ownDeck);
    if (!label) continue;
    map.set(deckLookupKey(label), label);
  }
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
}

/** Unique OUT card names from match history (and optional plan outs). */
export function knownOutCardsFromMatches(
  matches: Match[],
  deckName?: string,
): string[] {
  const deckKey = deckName ? deckLookupKey(deckName) : '';
  const names: string[] = [];
  for (const m of matches) {
    if (deckKey && deckLookupKey(m.ownDeck) !== deckKey) continue;
    for (const g of m.games) {
      for (const s of g.sideboard?.actualSwaps ?? []) {
        if (s.outCard?.trim()) names.push(s.outCard);
      }
    }
  }
  return uniqNames(names);
}

function uniqNames(names: string[]): string[] {
  const map = new Map<string, string>();
  for (const raw of names) {
    const n = normalizeDeckName(raw);
    if (!n || n.length < 2) continue;
    const key = deckLookupKey(n);
    if (!map.has(key)) map.set(key, n);
  }
  return Array.from(map.values());
}

export function formatMatchDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
