/**
 * Canonical deck display helpers — whitespace normalize + Title Case words.
 * Preserves intentional ALL-CAPS acronyms (e.g. UVS, FFA) via a simple heuristic.
 */

/** Trim + collapse internal whitespace. */
export function collapseWhitespace(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * Title-case a single word. Keeps words that are already ALL CAPS and length ≥ 2
 * (acronyms). Otherwise capitalizes the first letter and lowercases the rest.
 */
function titleCaseWord(word: string): string {
  if (!word) return word;
  // Preserve intentional acronyms: UVS, AI, FFA, etc.
  if (word.length >= 2 && word === word.toUpperCase() && /[A-Z]/.test(word)) {
    return word;
  }
  // Preserve mixed tokens like "Bo3" / "G2" that already start with a capital
  // and contain digits — leave as-is if they look intentional.
  if (/^[A-Z][a-z]*\d+$/.test(word) || /^\d+[A-Za-z]+$/.test(word)) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Normalize a deck (or legend) name for storage/display:
 * collapse whitespace + Title Case each word (preserve ALL-CAPS acronyms).
 */
export function normalizeDeckName(raw: string): string {
  const collapsed = collapseWhitespace(raw);
  if (!collapsed) return '';
  return collapsed
    .split(' ')
    .map(titleCaseWord)
    .join(' ');
}

/** Case-insensitive key for grouping / lookup. */
export function deckLookupKey(raw: string): string {
  return collapseWhitespace(raw).toLowerCase();
}
