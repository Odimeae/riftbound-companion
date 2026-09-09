import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { elevation } from '../theme/elevation';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

/** Sideboard slot 01–10 — empty dashed on bg; filled e1 elevated + name */
export function SlotTile({
  index,
  name,
  onPress,
  onClear,
}: {
  /** 0-based index; displayed as 01–10 */
  index: number;
  name?: string;
  onPress?: () => void;
  onClear?: () => void;
}) {
  const filled = Boolean(name?.trim());
  const label = String(index + 1).padStart(2, '0');

  const content = (
    <View style={[styles.tile, filled ? styles.filled : styles.empty]}>
      <Text style={[styles.index, filled && styles.indexFilled]}>{label}</Text>
      {filled ? (
        <>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          {onClear ? (
            <Pressable
              onPress={onClear}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${name}`}
              style={styles.clearHit}
            >
              <Ionicons name="close" size={18} color={colors.inactive} />
            </Pressable>
          ) : null}
        </>
      ) : (
        <Text style={styles.placeholder}>Empty</Text>
      )}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: spacing.rowMinH,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  empty: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderStyle: 'dashed',
  },
  filled: {
    ...elevation.e1,
  },
  index: {
    color: colors.inactive,
    fontWeight: '700',
    fontSize: 12,
    width: 24,
    letterSpacing: 0.4,
  },
  indexFilled: {
    color: colors.textSecondary,
  },
  name: {
    flex: 1,
    color: colors.text,
    ...typography.title,
  },
  placeholder: {
    flex: 1,
    color: colors.inactive,
    ...typography.body,
  },
  clearHit: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
