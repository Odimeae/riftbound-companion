import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DeckSideboard,
  MatchupPlan,
  SIDEBOARD_MAX,
  clampSideboardCards,
  normalizeSwaps,
} from '../types/sideboard';
import { createId } from '../utils/id';
import { normalizeDeckName } from '../utils/deckName';

const SIDEBOARDS_KEY = '@riftbound/sideboards/v1';
const PLANS_KEY = '@riftbound/matchup-plans/v1';

export async function loadSideboards(): Promise<DeckSideboard[]> {
  try {
    const raw = await AsyncStorage.getItem(SIDEBOARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DeckSideboard[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSideboard);
  } catch {
    return [];
  }
}

export async function saveSideboards(items: DeckSideboard[]): Promise<void> {
  await AsyncStorage.setItem(SIDEBOARDS_KEY, JSON.stringify(items));
}

export async function loadMatchupPlans(): Promise<MatchupPlan[]> {
  try {
    const raw = await AsyncStorage.getItem(PLANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MatchupPlan[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizePlan)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function saveMatchupPlans(items: MatchupPlan[]): Promise<void> {
  await AsyncStorage.setItem(PLANS_KEY, JSON.stringify(items));
}

function normalizeSideboard(s: Partial<DeckSideboard>): DeckSideboard {
  const cards = clampSideboardCards(
    Array.isArray(s.cards) ? s.cards.map(String) : [],
  );
  return {
    id: s.id || createId(),
    deckName: normalizeDeckName(s.deckName ?? '') || 'Untitled Deck',
    cards,
    updatedAt: s.updatedAt || new Date().toISOString(),
  };
}

function normalizePlan(p: Partial<MatchupPlan>): MatchupPlan {
  const now = new Date().toISOString();
  return {
    id: p.id || createId(),
    deckName: normalizeDeckName(p.deckName ?? '') || 'Untitled Deck',
    vsLegend: (p.vsLegend ?? '').trim(),
    vsArchetype: (p.vsArchetype ?? '').trim(),
    swaps: normalizeSwaps(Array.isArray(p.swaps) ? p.swaps : []).slice(
      0,
      SIDEBOARD_MAX,
    ),
    notes: typeof p.notes === 'string' ? p.notes : '',
    createdAt: p.createdAt || now,
    updatedAt: p.updatedAt || now,
  };
}

export function buildSideboard(
  deckName: string,
  cards: string[],
  existingId?: string,
): DeckSideboard {
  return {
    id: existingId || createId(),
    deckName: normalizeDeckName(deckName) || 'Untitled Deck',
    cards: clampSideboardCards(cards),
    updatedAt: new Date().toISOString(),
  };
}

export type MatchupPlanInput = Omit<
  MatchupPlan,
  'id' | 'createdAt' | 'updatedAt'
> & { id?: string; createdAt?: string };

export function buildMatchupPlan(input: MatchupPlanInput): MatchupPlan {
  const now = new Date().toISOString();
  return {
    id: input.id || createId(),
    deckName: normalizeDeckName(input.deckName) || 'Untitled Deck',
    vsLegend: input.vsLegend.trim(),
    vsArchetype: input.vsArchetype.trim(),
    swaps: normalizeSwaps(input.swaps).slice(0, SIDEBOARD_MAX),
    notes: input.notes?.trim() ?? '',
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
}
