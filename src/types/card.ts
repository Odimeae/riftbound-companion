/**
 * Local card catalog + refs.
 * imageUrl stays null until Riot API (app 879328) — UI uses local placeholder.
 */

export interface CardCatalogEntry {
  /** Stable id — stub today; swap to Riot id later without UI redesign. */
  id: string;
  name: string;
  /** Set code prefix e.g. OGN / VEN / UNL */
  set?: string;
  /** Full card code e.g. OGN-007a */
  code?: string;
  /** Remote art URL. Always null in stub catalog (no CDN scrape). */
  imageUrl?: string | null;
}

/** Qty-bearing reference stored on deck / sideboard lists. */
export interface CardRef {
  id: string;
  qty: number;
}
