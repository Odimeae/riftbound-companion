import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FieldLabel } from './Field';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { formatMatchDate } from '../utils/stats';

type Props = {
  value: Date;
  onChange: (next: Date) => void;
};

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Web fallback: native datetime-local input (no community DateTimePicker on web).
 */
export function MatchDateTimeField({ value, onChange }: Props) {
  const inputValue = useMemo(() => toLocalInputValue(value), [value]);

  return (
    <View>
      <FieldLabel>Date & time</FieldLabel>
      <Text style={styles.preview}>{formatMatchDate(value.toISOString())}</Text>
      <input
        type="datetime-local"
        value={inputValue}
        onChange={(e) => {
          const next = e.target.value;
          if (!next) return;
          const parsed = new Date(next);
          if (!Number.isNaN(parsed.getTime())) {
            onChange(parsed);
          }
        }}
        style={{
          minHeight: spacing.hitTarget,
          width: '100%',
          boxSizing: 'border-box',
          borderRadius: 12,
          backgroundColor: colors.inset,
          border: `1px solid ${colors.hairline}`,
          color: colors.text,
          fontSize: 16,
          fontWeight: 600,
          paddingLeft: 14,
          paddingRight: 14,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          colorScheme: 'dark',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
});
