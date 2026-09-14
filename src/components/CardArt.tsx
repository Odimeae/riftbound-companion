import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { isCardCodeToken } from '../utils/deckName';

export type CardArtState = 'loading' | 'placeholder' | 'missing' | 'ready';

export type CardArtSize =
  | typeof spacing.artThumb
  | typeof spacing.artSlot
  | typeof spacing.artPicker
  | number;

/**
 * Designer P0 card art frame — fixed square, inset bg, hairline, radius 8.
 * Riot seam: pass uri when API ready; onError falls back to placeholder.
 * Never resize the frame for state changes.
 */
export function CardArt({
  size,
  uri,
  name,
  state: stateProp,
  qty,
  warn,
}: {
  size: CardArtSize;
  uri?: string | null;
  name: string;
  state?: CardArtState;
  /** Optional qty badge (picker) — 18px top-right */
  qty?: number;
  /** Missing/warn accent on frame */
  warn?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const pulse = useRef(new Animated.Value(0.45)).current;

  const hasUri = Boolean(uri && !imgFailed);
  const state: CardArtState =
    stateProp ??
    (hasUri ? 'ready' : name.trim() ? 'placeholder' : 'missing');

  useEffect(() => {
    setImgFailed(false);
  }, [uri]);

  useEffect(() => {
    if (state !== 'loading') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, pulse]);

  const monogram = useMemo(() => makeMonogram(name), [name]);
  const frame = {
    width: size,
    height: size,
    borderRadius: spacing.artRadius,
  };

  return (
    <View
      style={[
        styles.frame,
        frame,
        warn && styles.frameWarn,
        state === 'missing' && styles.frameMissing,
      ]}
      accessibilityLabel={name ? `Art for ${name}` : 'Card art'}
    >
      {state === 'loading' ? (
        <Animated.View
          style={[styles.fill, { opacity: pulse, backgroundColor: colors.inset }]}
        />
      ) : null}

      {state === 'ready' && hasUri ? (
        <Image
          source={{ uri: uri! }}
          style={[styles.img, frame]}
          resizeMode="cover"
          onError={() => setImgFailed(true)}
        />
      ) : null}

      {(state === 'placeholder' ||
        state === 'missing' ||
        (state === 'ready' && !hasUri) ||
        imgFailed) &&
      state !== 'loading' ? (
        <View style={[styles.fill, styles.placeholder]}>
          {state === 'missing' && !monogram ? (
            <Text style={styles.missingMark}>?</Text>
          ) : (
            <Text style={styles.monogram} numberOfLines={1}>
              {monogram || '?'}
            </Text>
          )}
        </View>
      ) : null}

      {typeof qty === 'number' && qty > 0 ? (
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyText}>{qty > 99 ? '99+' : String(qty)}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * 2–3 char monogram for placeholder art.
 * Real names → initials. Codes → set/number fragment (e.g. OGN-166 → 166), never `01`.
 */
export function makeMonogram(name: string): string {
  const cleaned = (name ?? '').trim();
  if (!cleaned) return '';

  if (isCardCodeToken(cleaned)) {
    const dash = cleaned.indexOf('-');
    const set = cleaned.slice(0, dash);
    const rest = cleaned.slice(dash + 1).replace(/[^A-Za-z0-9]/g, '');
    if (/\d/.test(rest)) {
      return rest.slice(0, 3).toUpperCase();
    }
    if (set.length >= 2) return set.slice(0, 3).toUpperCase();
    return (set + rest).slice(0, 3).toUpperCase();
  }

  // Prefer initials of first 2–3 words (spaces / underscores only — not hyphens in names)
  const words = cleaned.split(/[\s/_]+/).filter(Boolean);
  if (words.length >= 2) {
    const letters = words
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    return letters.slice(0, 3);
  }
  const alnum = cleaned.replace(/[^A-Za-z0-9]/g, '');
  return alnum.slice(0, 3).toUpperCase();
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.inset,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameWarn: {
    borderColor: colors.warning,
  },
  frameMissing: {
    borderStyle: 'dashed',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    backgroundColor: colors.inset,
  },
  img: {
    // 1:1 center crop via cover + fixed square frame
  },
  monogram: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  missingMark: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  qtyBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: spacing.artQtyBadge,
    height: spacing.artQtyBadge,
    borderRadius: spacing.artQtyBadge / 2,
    paddingHorizontal: 4,
    backgroundColor: colors.elevated2,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
  },
});
