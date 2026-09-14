import { CardRef } from './card';

/** One card line in a companion deck list (main or sideboard). */
export interface DeckCardEntry {
  /** Catalog id when resolved; otherwise omitted / raw. */
  id?: string;
  /** Display label — catalog name when known, otherwise card code. */
  name: string;
  /** Piltover / Riot-style card code (e.g. OGN-007a). */
  code?: string;
  /**
   * Interim art URL (PA CDN) until Riot 879328 fills catalog imageUrl.
   * UI prefers this, then catalog, then monogram placeholder.
   */
  imageUrl?: string | null;
  qty: number;
}

/**
 * Local companion deck list linked to a Sideboard deck name.
 * Sourced from Piltover Archive URL / deck code (no account OAuth).
 */
export interface CompanionDeck {
  id: string;
  deckName: string;
  mainCards: DeckCardEntry[];
  sideboardCards: DeckCardEntry[];
  /** Parallel CardRef view for Riot-ready storage (id + qty). */
  mainRefs?: CardRef[];
  sideboardRefs?: CardRef[];
  piltoverUrl?: string;
  deckCode?: string;
  updatedAt: string;
  createdAt: string;
}

export type CompanionDeckInput = Omit<
  CompanionDeck,
  'id' | 'createdAt' | 'updatedAt'
> & { id?: string; createdAt?: string };
