import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { FieldLabel } from './Field';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { formatMatchDate } from '../utils/stats';

type Props = {
  value: Date;
  onChange: (next: Date) => void;
};

/** Native (iOS/Android) date & time picker for match logging. */
export function MatchDateTimeField({ value, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed' || !selected) return;
    onChange(selected);
  };

  const openPicker = (mode: 'date' | 'time') => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  return (
    <View>
      <FieldLabel>Date & time</FieldLabel>
      <View style={styles.dateRow}>
        <Pressable style={styles.dateBtn} onPress={() => openPicker('date')}>
          <Text style={styles.dateText}>{formatMatchDate(value.toISOString())}</Text>
        </Pressable>
        {Platform.OS === 'ios' ? (
          <Pressable style={styles.dateBtn} onPress={() => openPicker('time')}>
            <Text style={styles.dateText}>Change time</Text>
          </Pressable>
        ) : null}
      </View>
      {showPicker ? (
        <DateTimePicker
          value={value}
          mode={pickerMode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickerChange}
          themeVariant="dark"
        />
      ) : null}
      {Platform.OS === 'ios' && showPicker ? (
        <Pressable onPress={() => setShowPicker(false)} style={styles.donePicker}>
          <Text style={styles.donePickerText}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dateRow: {
    gap: 8,
  },
  dateBtn: {
    minHeight: spacing.hitTarget,
    borderRadius: 12,
    backgroundColor: colors.inset,
    borderWidth: 1,
    borderColor: colors.hairline,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dateText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  donePicker: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  donePickerText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 16,
  },
});
