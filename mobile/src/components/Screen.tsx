import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  title: string;
  children?: ReactNode;
  /** Centra el contenido vertical y horizontalmente (pantallas placeholder). */
  centered?: boolean;
};

/**
 * Contenedor de las pantallas con pestañas: título arriba y respeto del notch.
 * El borde inferior lo gestiona la barra de pestañas, por eso solo se usa el superior.
 */
export function Screen({ title, children, centered = false }: Props) {
  const { colors } = useTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <Text variant="headlineMedium" style={[styles.title, { color: colors.onBackground }]}>
        {title}
      </Text>
      <View style={[styles.content, centered && styles.centered]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  title: { fontWeight: 'bold', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  content: { flex: 1, padding: 24 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 8 },
});
