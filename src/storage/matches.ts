import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameResult,
  Match,
  MatchInput,
  emptyNote,
  normalizeGameSideboard,
  normalizeMatchNote,
} from '../types/match';
import { createId } from '../utils/id';
import { normalizeDeckName } from '../utils/deckName';

const STORAGE_KEY = '@riftbound/matches/v1';

export async function loadMatches(): Promise<Match[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Match[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeMatch).sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

export async function saveMatches(matches: Match[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
}

function normalizeGame(g: Partial<GameResult>): GameResult {
  const gameNumber = typeof g.gameNumber === 'number' ? g.gameNumber : 1;
  const sideboard = normalizeGameSideboard(gameNumber, g.sideboard ?? null);
  return {
    id: g.id || createId(),
    gameNumber,
    outcome: g.outcome === 'Loss' ? 'Loss' : 'Win',
    ...(sideboard ? { sideboard } : {}),
  };
}

function normalizeMatch(m: Partial<Match>): Match {
  return {
    id: m.id || createId(),
    date: m.date || new Date().toISOString(),
    eventType: m.eventType === 'Event' ? 'Event' : 'Friendly',
    format: m.format === 'Bo3' ? 'Bo3' : 'Bo1',
    ownDeck: normalizeDeckName(m.ownDeck ?? ''),
    ownLegend: normalizeDeckName(m.ownLegend ?? ''),
    opponentDeck: normalizeDeckName(m.opponentDeck ?? ''),
    opponentLegend: normalizeDeckName(m.opponentLegend ?? ''),
    outcome: m.outcome === 'Loss' ? 'Loss' : 'Win',
    games: Array.isArray(m.games) ? m.games.map(normalizeGame) : [],
    note: normalizeMatchNote(m.note ?? emptyNote()),
    createdAt: m.createdAt || new Date().toISOString(),
    updatedAt: m.updatedAt || new Date().toISOString(),
  };
}

export function buildMatch(input: MatchInput): Match {
  const now = new Date().toISOString();
  return {
    id: input.id || createId(),
    date: input.date,
    eventType: input.eventType,
    format: input.format,
    ownDeck: normalizeDeckName(input.ownDeck),
    ownLegend: normalizeDeckName(input.ownLegend),
    opponentDeck: normalizeDeckName(input.opponentDeck),
    opponentLegend: normalizeDeckName(input.opponentLegend),
    outcome: input.outcome,
    games: input.games.map((g) => normalizeGame(g)),
    note: normalizeMatchNote(input.note ?? emptyNote()),
    createdAt: now,
    updatedAt: now,
  };
}
