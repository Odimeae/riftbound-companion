import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';
import { elevation } from '../theme/elevation';
import { spacing } from '../theme/spacing';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  /** e2 soft shadow — Log match / Save sideboard primary CTAs only */
  depth,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'ghost';
  depth?: 'e2';
}) {
  const bg =
    variant === 'danger'
      ? colors.danger
      : variant === 'ghost'
        ? colors.elevated
        : colors.accent;
  const fg = variant === 'primary' ? colors.accentOn : colors.text;
  const border =
    variant === 'ghost'
      ? { borderWidth: 1 as const, borderColor: colors.hairline }
      : undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg },
        border,
        depth === 'e2' && elevation.e2Shadow,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.label, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: spacing.hitTarget,
    height: spacing.hitTarget,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
  },
});
