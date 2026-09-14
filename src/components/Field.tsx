import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from '../theme/colors';
import { elevation } from '../theme/elevation';
import { spacing } from '../theme/spacing';
import { SectionLabel } from './SectionLabel';

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  multiline,
  autoCapitalize,
  onBlur,
  invalid,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  onBlur?: TextInputProps['onBlur'];
  /** Warn / loss-soft border for required-field nudge */
  invalid?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.inactive}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={[
        styles.input,
        multiline && styles.multiline,
        invalid && styles.inputInvalid,
      ]}
      autoCapitalize={autoCapitalize ?? (multiline ? 'sentences' : 'words')}
      onBlur={onBlur}
    />
  );
}

/**
 * e1 elevated form “sheet” — Match / Decks / Result / Mistakes / Notes.
 * Optional inset = recessed notes-style panel inside a sheet.
 */
export function SectionCard({
  title,
  children,
  inset,
}: {
  title?: string;
  children: React.ReactNode;
  /** Recessed notes-style panel */
  inset?: boolean;
}) {
  return (
    <View style={[styles.sheet, elevation.e1, inset && styles.sheetInset]}>
      {title ? <SectionLabel>{title}</SectionLabel> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inset,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 12,
    color: colors.text,
    fontSize: 16,
    minHeight: spacing.hitTarget,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputInvalid: {
    borderColor: colors.warning,
    backgroundColor: colors.warningBg,
  },
  multiline: {
    minHeight: 108,
    paddingTop: 12,
  },
  sheet: {
    gap: 10,
    borderRadius: spacing.radius,
    padding: 14,
  },
  sheetInset: {
    backgroundColor: colors.inset,
  },
  content: {
    gap: 14,
  },
});
