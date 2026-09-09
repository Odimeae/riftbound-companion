import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  MISTAKE_TAGS,
  MISTAKE_TAG_LABELS,
  MistakeTag,
} from '../types/match';
import { Chip } from './Chip';

export function TagPicker({
  selected,
  onChange,
}: {
  selected: MistakeTag[];
  onChange: (tags: MistakeTag[]) => void;
  /** @deprecated Bo1 no longer filters mistake tags (Sideboard removed from taxonomy). */
  format?: unknown;
}) {
  const toggle = (tag: MistakeTag) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  return (
    <View style={styles.wrap}>
      {MISTAKE_TAGS.map((tag) => (
        <Chip
          key={tag}
          label={MISTAKE_TAG_LABELS[tag]}
          active={selected.includes(tag)}
          onPress={() => toggle(tag)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
