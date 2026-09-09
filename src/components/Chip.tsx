import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { elevation } from '../theme/elevation';

export function Chip({
  label,
  active,
  onPress,
  style,
  compact,
  quiet,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  compact?: boolean;
  /** Quiet tag look — inset/elevated + hairline + muted; never accent border */
  quiet?: boolean;
}) {
  const chipStyle = [
    styles.chip,
    elevation.e1,
    compact && styles.chipCompact,
    quiet && styles.chipQuiet,
    active && !quiet && styles.chipActive,
    style,
  ];
  const textStyle = [
    styles.text,
    compact && styles.textCompact,
    quiet && styles.textQuiet,
    active && !quiet && styles.textActive,
  ];

  if (!onPress) {
    return (
      <View style={chipStyle}>
        <Text style={textStyle} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      style={({ pressed }) => [...chipStyle, pressed && styles.pressed]}
    >
      <Text style={textStyle} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCompact: {
    minHeight: 26,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  /** Tag chips — recessed, muted, no accent */
  chipQuiet: {
    backgroundColor: colors.inset,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 8,
  },
  chipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  textCompact: {
    fontSize: 11,
    fontWeight: '600',
  },
  textQuiet: {
    color: colors.textMuted,
  },
  textActive: {
    color: colors.accent,
  },
  pressed: {
    opacity: 0.85,
  },
});
