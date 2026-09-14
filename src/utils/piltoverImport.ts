import { getDeckFromCode } from '@piltoverarchive/riftbound-deck-codes';
import type { Card } from '@piltoverarchive/riftbound-deck-codes';
import { DeckCardEntry } from '../types/deck';
import { CardRef } from '../types/card';
import { deckLookupKey, isCardCodeToken, normalizeDeckName } from './deckName';
import { SIDEBOARD_MAX } from '../types/sideboard';
import { resolveCardQuery, toCardRef } from './cardResolve';

/** Riftbound card code shape — delegates to isCardCodeToken (digit required). */
export function isCardCode(raw: string): boolean {
  return isCardCodeToken((raw ?? '').trim());
}

/** Base32-ish deck code body (PA codes are uppercase A–Z / 2–7). */
const DECK_CODE_BODY = /^[A-Z2-7]{20,}$/i;

export type ParsedPiltoverInput =
  | { kind: 'code'; code: string; sourceUrl?: string }
  | { kind: 'viewUrl'; url: string }
  | { kind: 'invalid'; reason: string };

export type ResolvedPiltoverCode = {
  code: string;
  sourceUrl?: string;
  /** From &lt;title&gt; e.g. "kennen sie den schon? - Odi meae" → deck part. */
  suggestedName?: string;
  /** Code → display name from PA HTML (when fetched). */
  nameByCode?: Map<string, string>;
};

/**
 * Classify paste input: raw deck code, deckbuilder?code=, or /decks/view/… URL.
 */
export function classifyPiltoverInput(raw: string): ParsedPiltoverInput {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { kind: 'invalid', reason: 'Paste a Piltover Archive URL or deck code.' };
  }

  // Bare deck code
  if (DECK_CODE_BODY.test(trimmed) && !/\s/.test(trimmed) && !trimmed.includes('/')) {
    return { kind: 'code', code: trimmed.toUpperCase() };
  }

  // Try URL parse (allow missing scheme)
  let urlText = trimmed;
  if (!/^https?:\/\//i.test(urlText) && /piltoverarchive\.com/i.test(urlText)) {
    urlText = `https://${urlText.replace(/^\/\//, '')}`;
  }

  try {
    const u = new URL(urlText);
    const host = u.hostname.replace(/^www\./i, '');
    const codeParam =
      u.searchParams.get('code') ||
      u.searchParams.get('deckCode') ||
      u.searchParams.get('deck_code');
    if (codeParam && DECK_CODE_BODY.test(codeParam.trim())) {
      return {
        kind: 'code',
        code: codeParam.trim().toUpperCase(),
        sourceUrl: u.toString(),
      };
    }
    if (host === 'piltoverarchive.com' && /\/decks\/view\//i.test(u.pathname)) {
      return { kind: 'viewUrl', url: u.toString() };
    }
    // Any other PA URL that might embed a code in HTML
    if (host === 'piltoverarchive.com') {
      return { kind: 'viewUrl', url: u.toString() };
    }
  } catch {
    // not a URL — fall through
  }

  // Loose: extract code= from a pasted fragment
  const frag = trimmed.match(/[?&]code=([A-Za-z2-7]{20,})/i);
  if (frag?.[1]) {
    return { kind: 'code', code: frag[1].toUpperCase(), sourceUrl: trimmed };
  }

  // Last resort: longest base32 token in the paste
  const tokens = trimmed.toUpperCase().match(/[A-Z2-7]{20,}/g);
  if (tokens?.length) {
    const best = tokens.reduce((a, b) => (b.length > a.length ? b : a));
    return { kind: 'code', code: best };
  }

  return {
    kind: 'invalid',
    reason: 'Could not find a deck code or Piltover Archive deck URL.',
  };
}

/** Pull deck code from HTML (deckbuilder?code= / Copy Code patterns). */
export function extractDeckCodeFromHtml(html: string): string | null {
  if (!html) return null;
  const patterns = [
    /deckbuilder\?code=([A-Z2-7]{20,})/i,
    /[?&]code=([A-Z2-7]{20,})/i,
    /"code"\s*:\s*"([A-Z2-7]{20,})"/i,
    /"deckCode"\s*:\s*"([A-Z2-7]{20,})"/i,
    /Copy Code[^A-Z2-7]{0,80}([A-Z2-7]{20,})/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1] && DECK_CODE_BODY.test(m[1])) {
      return m[1].toUpperCase();
    }
  }
  return null;
}

/**
 * PA &lt;title&gt; is usually `Deck Name - Author`. Prefer the deck name half.
 * Returns Title-Cased companion name, or undefined.
 */
export function extractDeckTitleFromHtml(html: string): string | undefined {
  if (!html) return undefined;
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!m?.[1]) return undefined;
  let title = m[1].trim();
  title = title
    .replace(/\s*\|\s*Piltover Archive.*$/i, '')
    .replace(/\s*[—–-]\s*Piltover Archive.*$/i, '')
    .trim();
  if (!title || /deck unavailable/i.test(title) || /^decks?\b/i.test(title)) {
    return undefined;
  }
  // "kennen sie den schon? - Odi meae" → deck name before last " - "
  const parts = title.split(/\s+[—–-]\s+/);
  const deckPart = (parts.length >= 2 ? parts.slice(0, -1).join(' - ') : title).trim();
  if (!deckPart || deckPart.length < 2) return undefined;
  return normalizeDeckName(deckPart) || undefined;
}



/** Hermes-safe global regex collector (avoids matchAll quirks on huge HTML). */
function safeMatchAll(re: RegExp, text: string): RegExpExecArray[] {
  const out: RegExpExecArray[] = [];
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const r = new RegExp(re.source, flags);
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = r.exec(text)) !== null) {
    out.push(m);
    if (m[0].length === 0) r.lastIndex++;
    if (++guard > 20000) break;
  }
  return out;
}

/** Interim PA CDN art — swap to Riot URI later without UI redesign. */
export function paCdnArtUrl(code: string): string | undefined {
  const c = (code ?? '').trim().toUpperCase();
  if (!isCardCode(c)) return undefined;
  return `https://cdn.piltoverarchive.com/cards/${c}.webp`;
}

/**
 * Build code → display name from PA deck HTML.
 * Prefers <img alt> + /cards/CODE.webp (srcSet ok with ?width=).
 */

export function mergeNameMaps(
  ...maps: Array<Map<string, string> | undefined>
): Map<string, string> {
  const out = new Map<string, string>();
  for (const map of maps) {
    if (!map) continue;
    for (const [k, v] of map) {
      const key = k.toUpperCase();
      const prev = out.get(key);
      if (!prev || v.length > prev.length) out.set(key, v);
    }
  }
  return out;
}

/** True when most list labels are still raw card codes. */
export function deckNeedsNameEnrich(entries: { name: string; code?: string }[]): boolean {
  if (!entries.length) return false;
  let codes = 0;
  for (const e of entries) {
    const n = (e.name || '').trim();
    if (isCardCode(n) || (e.code && n.toUpperCase() === e.code.toUpperCase())) {
      codes += 1;
    }
  }
  return codes >= Math.max(1, Math.ceil(entries.length * 0.4));
}

export function countNamedEntries(entries: { name: string; code?: string }[]): {
  named: number;
  total: number;
} {
  const total = entries.length;
  let named = 0;
  for (const e of entries) {
    const n = (e.name || '').trim();
    if (n && !isCardCode(n)) named += 1;
  }
  return { named, total };
}

/** Remap sideboard slot labels from codes → display names using deck entries. */
export function remapSlotLabels(
  slots: string[],
  entries: { name: string; code?: string }[],
): string[] {
  const byCode = new Map<string, string>();
  for (const e of entries) {
    const code = (e.code || '').trim().toUpperCase();
    const name = (e.name || '').trim();
    if (code && name && !isCardCode(name)) {
      byCode.set(code, name);
    }
  }
  return slots.map((raw) => {
    const s = (raw || '').trim();
    if (!s) return s;
    if (isCardCode(s)) {
      return byCode.get(s.toUpperCase()) || s;
    }
    return s;
  });
}

export function extractNameMapFromHtml(html: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!html) return map;

  const add = (code: string, name: string) => {
    const c = (code ?? '').trim().toUpperCase();
    let n = (name ?? '').trim();
    if (!c || !n || n.length < 2) return;
    if (/^https?:/i.test(n)) return;
    // Domain / rune-color false positives from RSC blobs
    if (/^(Chaos|Order|Fury|Calm|Body|Mind)$/i.test(n) && n.length <= 6) {
      return;
    }
    n = n.replace(/\s+\d+x\d+$/i, '').trim();
    const prev = map.get(c);
    if (!prev || n.length > prev.length) {
      map.set(c, n);
    }
  };

  // Same <img> tag: alt + cards/CODE.webp (optional ?query)
  for (const m of safeMatchAll(/<img\b([^>]+)>/gi, html)) {
    const tag = m[1] ?? '';
    const alt = tag.match(/\balt=["']([^"']+)["']/i)?.[1];
    const code = tag.match(
      /\/cards\/([A-Za-z]{2,5}-[A-Za-z0-9]+)\.webp/i,
    )?.[1];
    if (alt && code) add(code, alt);
  }

  // alt … /cards/CODE.webp within a wide window (srcSet / Next Image)
  for (const m of safeMatchAll(
    /alt=["']([^"']+)["'][\s\S]{0,1200}?\/cards\/([A-Za-z]{2,5}-[A-Za-z0-9]+)\.webp/gi,
    html,
  )) {
    add(m[2], m[1]);
  }

  // Escaped RSC: card":{"name":"X" near variantNumber
  for (const m of safeMatchAll(
    /\\"variantNumber\\":\\"([A-Za-z]{2,5}-[A-Za-z0-9]+)\\"[\s\S]{0,400}?\\"card\\":\{[^}]*?\\"name\\":\\"([^\\"]{2,80})\\"/gi,
    html,
  )) {
    add(m[1], m[2]);
  }
  for (const m of safeMatchAll(
    /\\"name\\":\\"([^\\"]{2,80})\\"[\s\S]{0,200}?\\"variantNumber\\":\\"([A-Za-z]{2,5}-[A-Za-z0-9]+)\\"/gi,
    html,
  )) {
    // Only trust when name looks like a card title (has space or long)
    const n = m[1];
    if (n.includes(' ') || n.length >= 8) add(m[2], n);
  }

  return map;
}

export async function resolveDeckCodeFromInput(
  raw: string,
): Promise<ResolvedPiltoverCode> {
  const classified = classifyPiltoverInput(raw);
  if (classified.kind === 'invalid') {
    throw new Error(classified.reason);
  }
  if (classified.kind === 'code') {
    // Best-effort: pull names from deckbuilder HTML when online.
    let nameByCode: Map<string, string> | undefined;
    let suggestedName: string | undefined;
    try {
      const builderUrl = `https://piltoverarchive.com/deckbuilder?code=${encodeURIComponent(classified.code)}`;
      const enriched = await fetchPaHtml(builderUrl);
      if (enriched) {
        nameByCode = extractNameMapFromHtml(enriched.html);
        suggestedName = extractDeckTitleFromHtml(enriched.html);
        if (nameByCode.size === 0) nameByCode = undefined;
      }
    } catch {
      // offline / blocked — decode still works with codes + CDN art
    }
    return {
      code: classified.code,
      sourceUrl: classified.sourceUrl,
      suggestedName,
      nameByCode,
    };
  }

  const fetched = await fetchPaHtml(classified.url);
  if (!fetched) {
    throw new Error(
      'Could not fetch deck page. Paste the deck code instead.',
    );
  }
  const finalUrl = fetched.finalUrl || classified.url;
  const fromFinal = classifyPiltoverInput(finalUrl);
  const html = fetched.html;
  let suggestedName = extractDeckTitleFromHtml(html);
  let nameByCode = extractNameMapFromHtml(html);

  let code: string | undefined =
    fromFinal.kind === 'code' ? fromFinal.code : undefined;
  if (!code) {
    code = extractDeckCodeFromHtml(html) || undefined;
  }
  if (!code) {
    throw new Error(
      'No deck code found on that page. Open in Builder and paste the code, or paste deckbuilder?code=…',
    );
  }

  // Always merge deckbuilder HTML — view pages sometimes omit alts on device.
  try {
    const builderUrl = `https://piltoverarchive.com/deckbuilder?code=${encodeURIComponent(code)}`;
    const enriched = await fetchPaHtml(builderUrl);
    if (enriched) {
      nameByCode = mergeNameMaps(
        nameByCode,
        extractNameMapFromHtml(enriched.html),
      );
      suggestedName =
        suggestedName || extractDeckTitleFromHtml(enriched.html);
    }
  } catch {
    // keep view-page map
  }

  return {
    code,
    sourceUrl: classified.url,
    suggestedName,
    nameByCode: nameByCode.size ? nameByCode : undefined,
  };
}

async function fetchPaHtml(
  url: string,
): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (!html || html.length < 200) return null;
    return { html, finalUrl: res.url || url };
  } catch {
    return null;
  }
}

export function cardsToEntries(
  cards: Card[],
  nameByCode?: Map<string, string>,
): DeckCardEntry[] {
  return cards.map((c) => {
    const code = c.cardCode;
    const catalog = resolveCardQuery(code);
    const mapped =
      nameByCode?.get(code.toUpperCase()) ||
      nameByCode?.get(code) ||
      catalog?.name;
    const name = mapped || code;
    // Prefer catalog/Riot URI when set; else interim PA CDN by code.
    const imageUrl =
      (catalog?.imageUrl && catalog.imageUrl.trim()) ||
      paCdnArtUrl(code) ||
      undefined;
    return {
      ...(catalog ? { id: catalog.id } : {}),
      name,
      code,
      ...(imageUrl ? { imageUrl } : {}),
      qty: Math.max(1, c.count || 1),
    };
  });
}

/** Parallel CardRef lists for Riot-ready storage. */
export function entriesToRefs(entries: DeckCardEntry[]): CardRef[] {
  return entries.map((e) => {
    if (e.id) return { id: e.id, qty: Math.max(1, e.qty || 1) };
    return toCardRef(e.code || e.name, e.qty);
  });
}

/**
 * Best-effort code → display name map from known companion card names.
 * Until Riot/PA catalog: codes stay as labels.
 */
export function buildNameHintMap(knownNames: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const raw of knownNames) {
    const n = (raw ?? '').trim();
    if (!n) continue;
    if (isCardCode(n)) {
      map.set(n.toUpperCase(), n);
    }
  }
  return map;
}

export function decodePiltoverDeck(
  code: string,
  knownNames: string[] = [],
  nameByCode?: Map<string, string>,
): { mainCards: DeckCardEntry[]; sideboardCards: DeckCardEntry[] } {
  const decoded = getDeckFromCode(code);
  const hints = buildNameHintMap(knownNames);
  if (nameByCode) {
    for (const [k, v] of nameByCode) {
      hints.set(k.toUpperCase(), v);
    }
  }
  return {
    mainCards: cardsToEntries(decoded.mainDeck ?? [], hints),
    sideboardCards: cardsToEntries(decoded.sideboard ?? [], hints),
  };
}

/** Unique display labels for OUT pickers (main pool). */
export function mainPoolLabels(entries: DeckCardEntry[]): string[] {
  const map = new Map<string, string>();
  for (const e of entries) {
    const label = (e.name || e.code || '').trim();
    if (!label || label.length < 2) continue;
    const display = isCardCode(label) ? label : normalizeDeckName(label);
    const key = deckLookupKey(display);
    if (!map.has(key)) map.set(key, display);
  }
  return Array.from(map.values());
}

/**
 * Expand sideboard entries into up to SIDEBOARD_MAX slot names (qty-aware).
 */
export function expandSideboardSlots(
  entries: DeckCardEntry[],
  max = SIDEBOARD_MAX,
): string[] {
  const out: string[] = [];
  for (const e of entries) {
    const label = (e.name || e.code || '').trim();
    if (!label) continue;
    const display = isCardCode(label) ? label : normalizeDeckName(label);
    const copies = Math.max(1, e.qty || 1);
    for (let i = 0; i < copies; i++) {
      if (out.length >= max) return out;
      out.push(display);
    }
  }
  return out;
}

export function mainCardCount(entries: DeckCardEntry[]): number {
  return entries.reduce((sum, e) => sum + Math.max(1, e.qty || 1), 0);
}
