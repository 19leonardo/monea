import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, PaperProvider, Text } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getAccessToken } from '@/core/storage/tokens';
import { getMe } from '@/features/auth/auth.api';
import { useAuthStore } from '@/features/auth/auth.store';
import { theme } from '@/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <SessionGate />
          <StatusBar style="dark" />
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

/**
 * Decide qué grupo de rutas mostrar. Al arrancar, si hay un access token guardado,
 * hidrata la sesión con GET /users/me; Stack.Protected se encarga de redirigir a
 * (app) o a (auth) según isAuthenticated.
 */
function SessionGate() {
  const { isAuthenticated, isLoading, setSession, clearSession } = useAuthStore();
  const [networkError, setNetworkError] = useState(false);

  const restoreSession = useCallback(async () => {
    setNetworkError(false);
    useAuthStore.setState({ isLoading: true });

    const token = await getAccessToken();
    if (!token) {
      clearSession();
      return;
    }
    try {
      setSession(await getMe());
    } catch (error) {
      // Sin respuesta del servidor: los tokens pueden seguir siendo válidos, así que
      // no se borran; se ofrece reintentar. Un 401 ya lo resolvió el interceptor.
      if (isAxiosError(error) && !error.response) {
        setNetworkError(true);
      } else {
        clearSession();
      }
    }
  }, [setSession, clearSession]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (networkError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium">No se pudo conectar con el servidor</Text>
        <Text variant="bodyMedium" style={styles.hint}>
          Revisa tu conexión e inténtalo de nuevo.
        </Text>
        <Button mode="contained" onPress={restoreSession}>
          Reintentar
        </Button>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  hint: {
    textAlign: 'center',
    marginBottom: 8,
  },
});
