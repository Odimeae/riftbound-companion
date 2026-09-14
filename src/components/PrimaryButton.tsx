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
  const isDisabled = Boolean(disabled || loading);
  const bg = isDisabled
    ? colors.elevated
    : variant === 'danger'
      ? colors.danger
      : variant === 'ghost'
        ? colors.elevated
        : colors.accent;
  const fg = isDisabled
    ? colors.textMuted
    : variant === 'primary'
      ? colors.accentOn
      : colors.text;
  const border =
    variant === 'ghost' || isDisabled
      ? { borderWidth: 1 as const, borderColor: colors.hairline }
      : undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg },
        border,
        depth === 'e2' && !isDisabled && elevation.e2Shadow,
        pressed && !isDisabled && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
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
  pressed: {
    opacity: 0.88,
  },
});
