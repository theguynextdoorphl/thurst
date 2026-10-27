import { Platform, type TextStyle } from 'react-native';

export const colors = {
  bg: '#121212',
  surface: '#1E1E1E',
  surfaceRaised: '#2A2A2A',
  border: '#333333',
  text: '#FFFFFF',
  textMuted: '#B0B0B0',
  blue: '#1A237E',
  red: '#B71C1C',
  mango: '#FFB74D',
};

/** Primary gradient: deep blue through red to mango. */
export const gradient = [colors.blue, colors.red, colors.mango] as const;

const family = Platform.select({ ios: 'System', android: 'Roboto', default: 'Inter, Roboto, system-ui, sans-serif' });

export const type = {
  headline: { fontFamily: family, fontSize: 28, fontWeight: '700', color: colors.text },
  subheadline: { fontFamily: family, fontSize: 22, fontWeight: '500', color: colors.text },
  body: { fontFamily: family, fontSize: 16, fontWeight: '400', color: colors.text },
  caption: { fontFamily: family, fontSize: 14, fontWeight: '300', color: colors.textMuted },
  button: { fontFamily: family, fontSize: 16, fontWeight: '500', color: colors.text },
  label: { fontFamily: family, fontSize: 14, fontWeight: '500', color: colors.textMuted },
} satisfies Record<string, TextStyle>;

export const space = {
  pad: 16,
  section: 24,
  card: 12,
  buttonHeight: 48,
  touch: 44,
  radius: 12,
};

export const shadow = Platform.select({
  web: { boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});

export const motion = { card: 300, press: 100, page: 250, fade: 200 };
