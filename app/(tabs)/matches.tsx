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
import { spacing } from '../../src/theme/spacing';

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

  return (
    <View style={styles.screen}>
      {matches.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.headerTitle}>Matches</Text>
          <EmptyState
            title="No matches yet"
            message="Track event and friendly games with decks, results, and post-match notes."
            icon="game-controller-outline"
            ctaLabel="Log match"
            onPress={() => router.push('/match/log')}
          />
        </View>
      ) : (
        <>
          <View style={styles.top}>
            <Text style={styles.headerTitle}>Matches</Text>
            <PrimaryButton
              label="Log match"
              onPress={() => router.push('/match/log')}
              depth="e2"
            />
          </View>
          <FlatList
            data={matches}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
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
    gap: spacing.blockGap,
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
    paddingBottom: 40,
  },
  emptyWrap: {
    paddingHorizontal: spacing.screenPad,
    paddingTop: 4,
    gap: spacing.blockGap,
  },
});
