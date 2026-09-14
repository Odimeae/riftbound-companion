import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { elevation } from '../theme/elevation';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

/**
 * Slim e1 accordion — Reflect and similar optional blocks.
 * Collapsed shows title + muted meta only (no field preview).
 */
export function CollapseSection({
  title,
  meta = 'Optional',
  defaultExpanded = false,
  children,
}: {
  title: string;
  meta?: string;
  /** When true, starts expanded (e.g. detail with filled Reflect). */
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={[styles.shell, elevation.e1]}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}, ${meta}`}
      >
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.inactive}
        />
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: spacing.radius,
    overflow: 'hidden',
  },
  header: {
    minHeight: spacing.hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    color: colors.text,
    ...typography.title,
  },
  meta: {
    color: colors.textMuted,
    ...typography.meta,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: 12,
  },
});
