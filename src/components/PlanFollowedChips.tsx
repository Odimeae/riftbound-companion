import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  PLAN_FOLLOWED_LABELS,
  PLAN_FOLLOWED_OPTIONS,
  PlanFollowed,
} from '../types/sideboard';
import { colors } from '../theme/colors';

export function PlanFollowedChips({
  value,
  onChange,
  disabled,
}: {
  value: PlanFollowed;
  onChange: (v: PlanFollowed) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      {PLAN_FOLLOWED_OPTIONS.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            disabled={disabled}
            onPress={() => onChange(option)}
            style={[
              styles.chip,
              active && styles.chipActive,
              disabled && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {PLAN_FOLLOWED_LABELS[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.chipActive,
    borderColor: colors.accent,
  },
  disabled: { opacity: 0.45 },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: { color: colors.accent },
});
