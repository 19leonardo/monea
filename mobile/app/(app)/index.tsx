import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Text, useTheme } from 'react-native-paper';

import { getMe, logout } from '@/features/auth/auth.api';
import { useAuthStore } from '@/features/auth/auth.store';

// Inicio (placeholder funcional): saludo con los datos de /users/me y cierre de sesión.
export default function HomeScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const sessionUser = useAuthStore((state) => state.user);
  const [loggingOut, setLoggingOut] = useState(false);

  // Parte de los datos ya cargados al iniciar sesión y los refresca desde /users/me.
  const { data: user, isFetching } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    initialData: sessionUser ?? undefined,
  });

  const onLogout = async () => {
    setLoggingOut(true);
    // Borra la caché para que otro usuario no vea datos del anterior.
    queryClient.clear();
    // logout() borra los tokens y cierra la sesión; el layout raíz vuelve al login.
    await logout();
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text variant="headlineMedium" style={styles.greeting}>
        Hola, {user.name || user.email}
      </Text>

      <Card mode="contained" style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
            Tu cuenta
          </Text>
          <Text variant="bodyLarge">{user.email}</Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            Moneda: {user.currency}
          </Text>
          {isFetching && <ActivityIndicator size="small" style={styles.refreshing} />}
        </Card.Content>
      </Card>

      <Button
        mode="outlined"
        icon="logout"
        onPress={onLogout}
        loading={loggingOut}
        disabled={loggingOut}
      >
        Cerrar sesión
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 },
  greeting: { textAlign: 'center' },
  card: { width: '100%', maxWidth: 480 },
  cardContent: { gap: 4 },
  refreshing: { alignSelf: 'flex-start', marginTop: 8 },
});
