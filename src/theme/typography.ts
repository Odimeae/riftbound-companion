import { TextStyle } from 'react-native';

/** Type scale helpers — Home / table-ready dashboard */
export const typography = {
  hero: {
    fontSize: 44,
    fontWeight: '600',
    letterSpacing: -0.5,
  } satisfies TextStyle,
  title: {
    fontSize: 17,
    fontWeight: '600',
  } satisfies TextStyle,
  body: {
    fontSize: 15,
    fontWeight: '400',
  } satisfies TextStyle,
  meta: {
    fontSize: 13,
    fontWeight: '400',
  } satisfies TextStyle,
  /** Section headers only — uppercase + tracking */
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  } satisfies TextStyle,
};
