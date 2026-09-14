import React, { useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useMatches } from '../../src/context/MatchContext';
import { EmptyState } from '../../src/components/EmptyState';
import { MatchRow } from '../../src/components/MatchRow';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { colors } from '../../src/theme/colors';
import { spacing, stickyContentInset } from '../../src/theme/spacing';

export default function MatchesScreen() {
  const { matches } = useMatches();
  const router = useRouter();
  const navigation = useNavigation();

  // In-content title — clear leaked header actions
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerRight: () => null, headerTitle: '' });
    }, [navigation]),
  );

  const openLog = () => router.push('/match/log');

  return (
    <View style={styles.screen}>
      {matches.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.headerTitle}>Matches</Text>
          <EmptyState
            title="No matches yet"
            message="Log a match to track results."
            icon="game-controller-outline"
          />

        </View>
      ) : (
        <>
          <View style={styles.top}>
            <Text style={styles.headerTitle}>Matches</Text>
          </View>
          <FlatList
            data={matches}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={null}
            renderItem={({ item }) => (
              <MatchRow
                match={item}
                variant="flat"
                onPress={() => router.push(`/match/${item.id}`)}
              />
            )}
          />
        </>
      )}

      {/* Sticky Log match — same flush pattern as Home (no top duplicate CTA) */}
      <View style={styles.footer}>
        <PrimaryButton label="Log match" onPress={openLog} depth="e2" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  top: {
    paddingHorizontal: spacing.screenPad,
    paddingTop: 4,
    paddingBottom: 4,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  list: {
    paddingHorizontal: spacing.screenPad,
    paddingTop: 4,
    paddingBottom: stickyContentInset(0),
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: spacing.screenPad,
    paddingTop: 4,
    gap: spacing.sectionGap,
    paddingBottom: stickyContentInset(0),
  },
  fillerWrap: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingVertical: 12,
  },
  feedFiller: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 12,
  },
  footer: {
    paddingHorizontal: spacing.screenPad,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.background,
  },
});
