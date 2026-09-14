import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '../../src/utils/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMatches } from '../../src/context/MatchContext';
import { FieldLabel, SectionCard, TextField } from '../../src/components/Field';
import { CollapseSection } from '../../src/components/CollapseSection';
import { TagPicker } from '../../src/components/TagPicker';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { EmptyState } from '../../src/components/EmptyState';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { MistakeTag, emptyNote } from '../../src/types/match';

export default function EditNotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getMatch, updateNotes } = useMatches();
  const match = getMatch(id);
  const router = useRouter();

  const [oneLiner, setOneLiner] = useState('');
  const [wentWell, setWentWell] = useState('');
  const [wentPoorly, setWentPoorly] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [mistakeTags, setMistakeTags] = useState<MistakeTag[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!match) return;
    setOneLiner(typeof match.note.oneLiner === 'string' ? match.note.oneLiner : '');
    const poorly =
      (match.note.wentPoorly ?? '').trim() ||
      (match.note.mistakes ?? '').trim() ||
      '';
    setWentWell(match.note.wentWell ?? '');
    setWentPoorly(poorly);
    setNextTime(match.note.nextTime ?? '');
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
        wentWell: wentWell.trim(),
        wentPoorly: wentPoorly.trim(),
        nextTime: nextTime.trim(),
        mistakeTags,
      });
      router.back();
    } catch {
      showAlert('Could not save', 'Please try again.');
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

      <CollapseSection title="Reflect" meta="Optional">
        <View>
          <Text style={styles.reflectLabel}>What went well</Text>
          <TextField
            value={wentWell}
            onChangeText={setWentWell}
            placeholder="Optional"
          />
        </View>
        <View>
          <Text style={styles.reflectLabel}>What to improve</Text>
          <TextField
            value={wentPoorly}
            onChangeText={setWentPoorly}
            placeholder="Optional"
          />
        </View>
        <View>
          <Text style={styles.reflectLabel}>One change next time</Text>
          <TextField
            value={nextTime}
            onChangeText={setNextTime}
            placeholder="Optional"
          />
        </View>
      </CollapseSection>

      <PrimaryButton label="Save Notes" onPress={onSave} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.screenPad,
    gap: spacing.blockGap,
    paddingBottom: 40,
  },
  missing: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.screenPad,
    justifyContent: 'center',
  },
  reflectLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
});
