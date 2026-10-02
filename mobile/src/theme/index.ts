import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

// Paleta Material 3 con primario verde azulado (teal), asociado a finanzas y crecimiento.
export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#00796B',
    onPrimary: '#FFFFFF',
    primaryContainer: '#9EF2E4',
    onPrimaryContainer: '#00201C',
    secondary: '#4A635F',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#CCE8E2',
    onSecondaryContainer: '#05201C',
    tertiary: '#456179',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#CCE5FF',
    onTertiaryContainer: '#001E31',
    background: '#F4FBF8',
    onBackground: '#161D1C',
    surface: '#F4FBF8',
    onSurface: '#161D1C',
    surfaceVariant: '#DAE5E1',
    onSurfaceVariant: '#3F4947',
    outline: '#6F7977',
    error: '#BA1A1A',
  },
};
