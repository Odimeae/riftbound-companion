import React from 'react';
import { StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

/** Uppercase section header — Home / Matches / Sideboard P0 */
export function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle | ViewStyle;
}) {
  return <Text style={[styles.label, style as TextStyle]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    color: colors.inactive,
    ...typography.label,
  },
});
