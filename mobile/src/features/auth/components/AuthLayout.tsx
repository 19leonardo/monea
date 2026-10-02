import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  subtitle: string;
  children: ReactNode;
  /** Se dibuja fuera del scroll (p. ej. un Snackbar). */
  overlay?: ReactNode;
};

/** Marco común de las pantallas de login y registro: título Monea centrado. */
export function AuthLayout({ subtitle, children, overlay }: Props) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text variant="displayMedium" style={[styles.title, { color: colors.primary }]}>
              Monea
            </Text>
            <Text variant="titleMedium" style={{ color: colors.onSurfaceVariant }}>
              {subtitle}
            </Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
      {overlay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  header: { alignItems: 'center', marginBottom: 32, gap: 4 },
  title: { fontWeight: 'bold' },
});
