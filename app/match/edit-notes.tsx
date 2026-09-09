import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMatches } from '../../src/context/MatchContext';
import { FieldLabel, SectionCard, TextField } from '../../src/components/Field';
import { TagPicker } from '../../src/components/TagPicker';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { EmptyState } from '../../src/components/EmptyState';
import { colors } from '../../src/theme/colors';
import { MistakeTag, emptyNote, noteOneLiner } from '../../src/types/match';

export default function EditNotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getMatch, updateNotes } = useMatches();
  const match = getMatch(id);
  const router = useRouter();

  const [oneLiner, setOneLiner] = useState('');
  const [mistakeTags, setMistakeTags] = useState<MistakeTag[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!match) return;
    setOneLiner(noteOneLiner(match.note));
    setMistakeTags(match.note.mistakeTags ?? []);
  }, [match]);

  if (!match) {
    return (
      <View style={styles.missing}>
        <EmptyState
          title="Match not found"
          message="This match may have been deleted."
          ctaLabel="Go back"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  const onSave = async () => {
    setSaving(true);
    try {
      await updateNotes(match.id, {
        ...emptyNote(),
        oneLiner: oneLiner.trim(),
        mistakeTags,
      });
      router.back();
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <SectionCard title="Post-Match Notes">
        <View>
          <FieldLabel>Mistakes</FieldLabel>
          <TagPicker selected={mistakeTags} onChange={setMistakeTags} />
        </View>
        <View>
          <FieldLabel>Note (optional)</FieldLabel>
          <TextField
            value={oneLiner}
            onChangeText={setOneLiner}
            placeholder="One short line"
          />
        </View>
      </SectionCard>
      <PrimaryButton label="Save Notes" onPress={onSave} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  missing: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    justifyContent: 'center',
  },
});
