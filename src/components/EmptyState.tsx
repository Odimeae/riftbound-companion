import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { PrimaryButton } from './PrimaryButton';

export function EmptyState({
  title,
  message,
  icon = 'document-text-outline',
  ctaLabel,
  onPress,
  ctaVariant = 'primary',
}: {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  ctaLabel?: string;
  onPress?: () => void;
  /** ghost = e1 secondary (e.g. New plan) */
  ctaVariant?: 'primary' | 'ghost';
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={colors.inactive} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {ctaLabel && onPress ? (
        <PrimaryButton
          label={ctaLabel}
          onPress={onPress}
          variant={ctaVariant}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.elevated,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: 10,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.inset,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
