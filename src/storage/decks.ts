import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompanionDeck, CompanionDeckInput, DeckCardEntry } from '../types/deck';
import { createId } from '../utils/id';
import { normalizeDeckName } from '../utils/deckName';

const DECKS_KEY = '@riftbound/companion-decks/v1';

export async function loadCompanionDecks(): Promise<CompanionDeck[]> {
  try {
    const raw = await AsyncStorage.getItem(DECKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompanionDeck[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeCompanionDeck)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function saveCompanionDecks(items: CompanionDeck[]): Promise<void> {
  await AsyncStorage.setItem(DECKS_KEY, JSON.stringify(items));
}

function normalizeCardEntry(c: Partial<DeckCardEntry>): DeckCardEntry | null {
  const code =
    typeof c.code === 'string' && c.code.trim() ? c.code.trim() : undefined;
  const nameRaw =
    typeof c.name === 'string' && c.name.trim()
      ? c.name.trim()
      : code ?? '';
  if (!nameRaw) return null;
  const qty =
    typeof c.qty === 'number' && Number.isFinite(c.qty) && c.qty > 0
      ? Math.floor(c.qty)
      : 1;
  const id =
    typeof c.id === 'string' && c.id.trim() ? c.id.trim() : undefined;
  const imageUrl =
    typeof c.imageUrl === 'string' && c.imageUrl.trim()
      ? c.imageUrl.trim()
      : undefined;
  return {
    name: nameRaw,
    ...(id ? { id } : {}),
    ...(code ? { code } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    qty,
  };
}

export function normalizeCompanionDeck(
  d: Partial<CompanionDeck>,
): CompanionDeck {
  const now = new Date().toISOString();
  const mainCards = (
    Array.isArray(d.mainCards) ? d.mainCards : []
  )
    .map(normalizeCardEntry)
    .filter((x): x is DeckCardEntry => Boolean(x));
  const sideboardCards = (
    Array.isArray(d.sideboardCards) ? d.sideboardCards : []
  )
    .map(normalizeCardEntry)
    .filter((x): x is DeckCardEntry => Boolean(x));
  const mainRefs = Array.isArray(d.mainRefs) ? d.mainRefs : undefined;
  const sideboardRefs = Array.isArray(d.sideboardRefs)
    ? d.sideboardRefs
    : undefined;
  return {
    id: d.id || createId(),
    deckName: normalizeDeckName(d.deckName ?? '') || 'Untitled Deck',
    mainCards,
    sideboardCards,
    ...(mainRefs ? { mainRefs } : {}),
    ...(sideboardRefs ? { sideboardRefs } : {}),
    piltoverUrl:
      typeof d.piltoverUrl === 'string' && d.piltoverUrl.trim()
        ? d.piltoverUrl.trim()
        : undefined,
    deckCode:
      typeof d.deckCode === 'string' && d.deckCode.trim()
        ? d.deckCode.trim()
        : undefined,
    createdAt: d.createdAt || now,
    updatedAt: d.updatedAt || now,
  };
}

export function buildCompanionDeck(input: CompanionDeckInput): CompanionDeck {
  const now = new Date().toISOString();
  return normalizeCompanionDeck({
    ...input,
    id: input.id,
    createdAt: input.createdAt || now,
    updatedAt: now,
  });
}
