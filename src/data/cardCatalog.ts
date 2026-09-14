import { CardCatalogEntry } from '../types/card';

/**
 * Stub catalog — names for fuzzy resolve + codes when known.
 * imageUrl is always null (local silhouette placeholder in UI).
 * Later: fill imageUrl from Riot API without changing CardThumb.
 */
export const CARD_CATALOG: CardCatalogEntry[] = [
  { id: 'stub-divine-judgement', name: 'Divine Judgement', set: 'OGN', imageUrl: null },
  { id: 'stub-stacked-deck', name: 'Stacked Deck', set: 'OGN', code: 'OGN-183', imageUrl: null },
  { id: 'stub-cleave', name: 'Cleave', set: 'OGN', code: 'OGN-004', imageUrl: null },
  { id: 'stub-void-seeker', name: 'Void Seeker', set: 'OGN', imageUrl: null },
  { id: 'stub-falling-star', name: 'Falling Star', set: 'OGN', imageUrl: null },
  { id: 'stub-retreat', name: 'Retreat', set: 'OGN', imageUrl: null },
  { id: 'stub-challenge', name: 'Challenge', set: 'OGN', imageUrl: null },
  { id: 'stub-guard', name: 'Guard', set: 'OGN', imageUrl: null },
  { id: 'stub-heal', name: 'Heal', set: 'OGN', imageUrl: null },
  { id: 'stub-deny', name: 'Deny', set: 'OGN', imageUrl: null },
  { id: 'stub-single-combat', name: 'Single Combat', set: 'OGN', imageUrl: null },
  { id: 'stub-thermogenic-beam', name: 'Thermogenic Beam', set: 'OGN', imageUrl: null },
  { id: 'stub-pondering', name: 'Pondering', set: 'OGN', imageUrl: null },
  { id: 'stub-whispered-words', name: 'Whispered Words', set: 'OGN', imageUrl: null },
  { id: 'stub-blastcone', name: 'Blastcone', set: 'OGN', imageUrl: null },
  { id: 'stub-spiderling', name: 'Spiderling', set: 'OGN', imageUrl: null },
  { id: 'stub-poro', name: 'Poro', set: 'OGN', imageUrl: null },
  { id: 'stub-kennen', name: 'Kennen', set: 'VEN', code: 'VEN-113', imageUrl: null },
  { id: 'stub-jinx', name: 'Jinx', set: 'OGN', imageUrl: null },
  { id: 'stub-jax', name: 'Jax', set: 'OGN', imageUrl: null },
  { id: 'stub-viktor', name: 'Viktor', set: 'OGN', imageUrl: null },
  { id: 'stub-diana', name: 'Diana', set: 'OGN', imageUrl: null },
  { id: 'stub-vex', name: 'Vex', set: 'OGN', imageUrl: null },
  { id: 'stub-kaisa', name: "Kai'Sa", set: 'OGN', imageUrl: null },
];

const byId = new Map(CARD_CATALOG.map((c) => [c.id, c]));
const byCode = new Map(
  CARD_CATALOG.filter((c) => c.code).map((c) => [c.code!.toUpperCase(), c]),
);

export function getCardById(id: string): CardCatalogEntry | undefined {
  return byId.get(id);
}

export function getCardByCode(code: string): CardCatalogEntry | undefined {
  return byCode.get(code.trim().toUpperCase());
}

export function allCatalogCards(): CardCatalogEntry[] {
  return CARD_CATALOG;
}
