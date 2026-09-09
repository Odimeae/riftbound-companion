import { ViewStyle } from 'react-native';
import { colors } from './colors';

/**
 * Style A Rift Night Depth elevation ladder.
 * - e0: bg, no shadow (Recent rows + hairlines)
 * - e1: elevated + 1px hairline (deck chips)
 * - e2: elevated + hairline + soft shadow (Log match CTA only)
 */
export const elevation = {
  e0: {
    backgroundColor: colors.background,
  } satisfies ViewStyle,

  e1: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.hairline,
  } satisfies ViewStyle,

  /** Soft depth shadow — Log match CTA only */
  e2Shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, // ≈ #00000059
    shadowRadius: 12,
    elevation: 6,
  } satisfies ViewStyle,

  e2: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.hairline,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  } satisfies ViewStyle,
};
