import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MatchProvider } from '../src/context/MatchContext';
import { SideboardProvider } from '../src/context/SideboardContext';
import { colors } from '../src/theme/colors';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <MatchProvider>
          <SideboardProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerTitleStyle: { color: colors.text, fontWeight: '700' },
                contentStyle: { backgroundColor: colors.background },
                headerShadowVisible: false,
                // Never show settings/gear on any native header
                headerRight: () => null,
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="match/log"
                options={{
                  title: 'Log Match',
                  presentation: 'modal',
                  headerRight: () => null,
                }}
              />
              <Stack.Screen
                name="match/[id]"
                options={{
                  title: 'Match',
                  headerBackTitle: 'Matches',
                  headerRight: () => null,
                }}
              />
              <Stack.Screen
                name="match/compare"
                options={{
                  title: 'Compare',
                  headerBackTitle: 'Back',
                  headerRight: () => null,
                }}
              />
              <Stack.Screen
                name="match/edit-notes"
                options={{
                  title: 'Edit Notes',
                  presentation: 'modal',
                  headerRight: () => null,
                }}
              />
              <Stack.Screen
                name="sideboard/plan"
                options={{
                  title: 'Matchup Plan',
                  presentation: 'modal',
                  headerRight: () => null,
                }}
              />
            </Stack>
          </SideboardProvider>
        </MatchProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
