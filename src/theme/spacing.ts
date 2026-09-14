/**
 * Style A spacing tokens (P0).
 * Colors/elevation stay in their own modules — unchanged.
 */
export const spacing = {
  /** Screen horizontal/vertical pad */
  screenPad: 16,
  /** Gap between major sections */
  sectionGap: 20,
  /** List row vertical padding (12–14 band) */
  rowPadV: 13,
  /** Chip / pill horizontal gap */
  chipGap: 8,
  /** Chip min touch height */
  chipMinH: 44,
  /** Corner radius for sheets / cards */
  radius: 16,
  /** Flat list row min height */
  rowMinH: 52,
  /** Legacy alias — prefer sectionGap for major blocks */
  blockGap: 12,
  /** Primary control / CTA height */
  hitTarget: 44,
  /** Card art — Designer P0 frozen sizes (1:1 frames, never resize) */
  artThumb: 40,
  artSlot: 48,
  artPicker: 56,
  artRadius: 8,
  artQtyBadge: 18,
  /**
   * Extra gap above sticky Log CTA.
   * content bottom inset = stickyCtaHeight + tabSafeBottom + stickyCtaGap
   */
  stickyCtaGap: 24,
};

/** Measured sticky Log footer chrome (padTop 8 + CTA + padBottom 12). */
export const stickyCtaHeight =
  8 + spacing.hitTarget + 12;

/**
 * Scroll content padding so last items clear the sticky Log CTA.
 * Pass tab/safe-area bottom inset when the sticky sits above the tab bar
 * (usually 0 inside tab screens — tab navigator already insets).
 */
export function stickyContentInset(tabSafeBottom = 0): number {
  return stickyCtaHeight + tabSafeBottom + spacing.stickyCtaGap;
}

/**
 * Sticky Save footer on form screens (padTop 12 + CTA + padBottom baseline 12).
 * Sideboard / single-CTA sheets.
 */
export const stickyFormCtaHeight = 12 + spacing.hitTarget + 12;

/**
 * Sticky Save + Cancel footer (padTop 12 + CTA + gap 8 + Cancel + padBottom 12).
 * Log Match.
 */
export const stickyFormDualCtaHeight =
  12 + spacing.hitTarget + 8 + spacing.hitTarget + 12;

/**
 * Scroll content padding so last controls clear a sticky form footer.
 * Pass safe-area bottom; footer padBottom uses max(safeBottom, 12).
 */
export function stickyFormContentInset(
  safeBottom = 0,
  dual = false,
): number {
  const chrome = dual ? stickyFormDualCtaHeight : stickyFormCtaHeight;
  const extraSafe = Math.max(0, safeBottom - 12);
  return chrome + extraSafe + spacing.stickyCtaGap;
}
