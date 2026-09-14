import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { isCardCodeToken } from '../utils/deckName';
import { makeMonogram } from './CardArt';

/**
 * Style A portrait grid cell (2:3) — sideboard 5×2 / main 8-col.
 * Filled: cover art, or name monogram, or quiet pulse while unresolved.
 * Empty idle: hairline dashed + muted +. Accent ring (#A78BFA) only on
 * press or explicit selection — never on idle empty cells.
 * Soft QA P0: never show raw collector numbers (166, 214…) as hero text.
 */
export function PortraitCardCell({
  name,
  imageUrl,
  empty,
  selected,
  dimmed,
  onPress,
  accessibilityLabel,
}: {
  /** Display name (never a bare set code when resolved). */
  name?: string;
  imageUrl?: string | null;
  empty?: boolean;
  selected?: boolean;
  /** Soft mute (e.g. main card already in sideboard) — no accent ring. */
  dimmed?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl]);

  const trimmed = name?.trim() || '';
  const filled = !empty && Boolean(trimmed);
  const uri = imageUrl && imageUrl.trim() && !imgFailed ? imageUrl.trim() : null;
  const codeOnly = Boolean(trimmed && isCardCodeToken(trimmed));
  const monogram = useMemo(() => {
    if (codeOnly) return '';
    return makeMonogram(trimmed);
  }, [trimmed, codeOnly]);

  // Unresolved set code (or no usable monogram) → quiet pulse, not a number label.
  const showPulse = filled && !uri && (codeOnly || !monogram);

  useEffect(() => {
    if (!showPulse) return;
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
  }, [showPulse, pulse]);

  const body = (accent: boolean) => (
    <View
      style={[
        styles.cell,
        filled ? styles.filled : styles.empty,
        accent && styles.accentRing,
        dimmed && !accent && styles.dimmed,
      ]}
    >
      {filled ? (
        uri ? (
          <Image
            source={{ uri }}
            style={styles.img}
            resizeMode="cover"
            onError={() => setImgFailed(true)}
          />
        ) : showPulse ? (
          <Animated.View
            style={[styles.placeholder, { opacity: pulse }]}
            accessibilityLabel="Resolving card"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.monogram} numberOfLines={1}>
              {monogram}
            </Text>
          </View>
        )
      ) : (
        <Text style={styles.plus}>+</Text>
      )}
    </View>
  );

  if (!onPress) return body(Boolean(selected));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ||
        (filled ? `Remove ${name}` : 'Empty sideboard slot')
      }
      style={styles.hit}
    >
      {({ pressed }) => body(Boolean(selected || pressed))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    flex: 1,
  },
  cell: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    borderStyle: 'solid',
    borderWidth: 1,
  },
  empty: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  /** Press / explicit selection only — never idle empty. */
  accentRing: {
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'solid',
  },
  dimmed: {
    opacity: 0.45,
  },
  img: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inset,
  },
  monogram: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  plus: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
});
