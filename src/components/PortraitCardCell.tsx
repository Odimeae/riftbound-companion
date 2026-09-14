import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { makeMonogram } from './CardArt';

/**
 * Style A portrait grid cell (2:3) — sideboard 5×2 / main 8-col.
 * Filled: cover art (or monogram). Empty: dashed + muted +.
 * Press ring: 2px accent. No slot numbers.
 */
export function PortraitCardCell({
  name,
  imageUrl,
  empty,
  selected,
  onPress,
  accessibilityLabel,
}: {
  /** Display name (never a bare set code when resolved). */
  name?: string;
  imageUrl?: string | null;
  empty?: boolean;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [imageUrl]);

  const filled = !empty && Boolean(name?.trim());
  const uri = imageUrl && imageUrl.trim() && !imgFailed ? imageUrl.trim() : null;
  const monogram = useMemo(
    () => makeMonogram(name?.trim() || ''),
    [name],
  );

  const body = (
    <View
      style={[
        styles.cell,
        filled ? styles.filled : styles.empty,
        selected && styles.selected,
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
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.monogram} numberOfLines={1}>
              {monogram || '?'}
            </Text>
          </View>
        )
      ) : (
        <Text style={styles.plus}>+</Text>
      )}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ||
        (filled ? `Remove ${name}` : 'Empty sideboard slot')
      }
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    flex: 1,
  },
  pressed: {
    opacity: 0.9,
  },
  cell: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    borderStyle: 'solid',
  },
  empty: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  selected: {
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'solid',
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
