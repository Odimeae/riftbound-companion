import {
  allCatalogCards,
  getCardByCode,
  getCardById,
} from '../data/cardCatalog';
import { CardCatalogEntry, CardRef } from '../types/card';
import { deckLookupKey, isCardCodeToken, normalizeDeckName } from './deckName';

function normKey(raw: string): string {
  return deckLookupKey(raw).replace(/[^a-z0-9]+/g, '');
}

/**
 * Fuzzy-resolve free-text or card code onto a catalog entry.
 * Exact (name/code) → starts-with → includes. Best-effort stub.
 */
export function resolveCardQuery(raw: string): CardCatalogEntry | undefined {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return undefined;

  if (isCardCodeToken(trimmed)) {
    const byCode = getCardByCode(trimmed);
    if (byCode) return byCode;
  }

  const key = deckLookupKey(trimmed);
  const compact = normKey(trimmed);
  const catalog = allCatalogCards();

  const exact = catalog.find((c) => deckLookupKey(c.name) === key);
  if (exact) return exact;

  const starts = catalog.filter((c) => deckLookupKey(c.name).startsWith(key));
  if (starts.length === 1) return starts[0];

  const includes = catalog.filter((c) => {
    const nk = deckLookupKey(c.name);
    return nk.includes(key) || normKey(c.name).includes(compact);
  });
  if (includes.length === 1) return includes[0];
  if (includes.length > 1) {
    return [...includes].sort((a, b) => a.name.length - b.name.length)[0];
  }

  return undefined;
}

/** Display name for a free-text / code / catalog id. */
export function displayCardLabel(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  const hit = resolveCardQuery(trimmed) || getCardById(trimmed);
  if (hit) return hit.name;
  if (isCardCodeToken(trimmed)) return trimmed;
  return normalizeDeckName(trimmed) || trimmed;
}

/** Build CardRef from name/code + qty (unresolved → synthetic id). */
export function toCardRef(nameOrCode: string, qty: number): CardRef {
  const hit = resolveCardQuery(nameOrCode);
  const id = hit?.id ?? `raw:${deckLookupKey(nameOrCode) || nameOrCode}`;
  return { id, qty: Math.max(1, qty) };
}

export function labelForRef(ref: CardRef): string {
  const hit = getCardById(ref.id);
  if (hit) return hit.name;
  if (ref.id.startsWith('raw:')) {
    return normalizeDeckName(ref.id.slice(4)) || ref.id.slice(4);
  }
  return ref.id;
}

export function catalogEntryForLabel(raw: string): CardCatalogEntry | undefined {
  return resolveCardQuery(raw);
}

/** True when catalog hit exists but name is not an exact key match. */
export function isFuzzyMatch(raw: string): boolean {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return false;
  const hit = resolveCardQuery(trimmed);
  if (!hit) return false;
  const key = deckLookupKey(trimmed);
  if (deckLookupKey(hit.name) === key) return false;
  if (hit.code && hit.code.toUpperCase() === trimmed.toUpperCase()) return false;
  return true;
}
