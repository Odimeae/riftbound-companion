import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';

/** Icon + label content row (excludes home-indicator inset). */
const TAB_BAR_CONTENT_HEIGHT = 56;

/** Modest pad in browser Safari (viewport already sits above chrome). */
const BROWSER_BOTTOM_PAD = 10;

/**
 * Standalone PWA / native: fill home-indicator with the tab bar.
 * In-browser Safari: do NOT layer the full home-indicator inset on top of
 * the browser toolbar gap (that paints a thick body-colored strip).
 *
 * Defaults to false for SSR / first paint (safe for Safari-in-browser).
 * Client effect upgrades to true in installed PWA / native.
 */
function readStandaloneLike(): boolean {
  if (Platform.OS !== 'web') {
    return true;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) {
    return true;
  }
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches
    );
  } catch {
    return false;
  }
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Native: always standalone-like. Web SSR/first paint: browser-safe false,
  // then effect re-reads display-mode after mount (avoids useMemo SSR freeze).
  const [standaloneLike, setStandaloneLike] = useState(
    () => Platform.OS !== 'web'
  );
  useEffect(() => {
    setStandaloneLike(readStandaloneLike());
  }, []);

  const insetBottom = insets.bottom;
  let bottomPad: number;
  if (standaloneLike) {
    bottomPad = insetBottom > 8 ? insetBottom : 8;
  } else {
    bottomPad = BROWSER_BOTTOM_PAD;
  }

  return (
    <Tabs
      // Disable RN Bottom Tabs' default bottom safe-area — we apply ONE pad
      // via tabBarStyle so the charcoal surface fills it (never body #090A0F).
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        headerShadowVisible: false,
        // Default: no header actions on any tab (prevents Home settings leaking)
        headerRight: () => null,
        tabBarStyle: {
          // Solid surface so intentional bottom pad is charcoal, never black body
          backgroundColor: colors.surface,
          borderTopColor: colors.hairline,
          borderTopWidth: StyleSheet.hairlineWidth,
          // Single source of height: content row + our pad only (RN inset is 0)
          height: TAB_BAR_CONTENT_HEIGHT + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inactive,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          // In-content H1 + WR pill — hide nav title
          headerTitle: '',
          headerRight: () => null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          // In-content H1 — hide nav title (parity with Home/Sideboard)
          headerTitle: '',
          headerRight: () => null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="sideboard"
        options={{
          title: 'Sideboard',
          // Drop centered nav title — in-screen H1 + meta only
          headerTitle: '',
          headerRight: () => null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="albums-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
