import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Divider, List, Text, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { getMe, logout } from '@/features/auth/auth.api';
import { useAuthStore } from '@/features/auth/auth.store';

function initials(name: string | null | undefined, email: string): string {
  const source = name?.trim() || email;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const sessionUser = useAuthStore((state) => state.user);
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: user } = useQuery({
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
    return <Screen title="Perfil" />;
  }

  return (
    <Screen title="Perfil">
      <View style={styles.header}>
        <Avatar.Text size={72} label={initials(user.name, user.email)} />
        <Text variant="titleLarge">{user.name || 'Sin nombre'}</Text>
      </View>

      <Card mode="contained" style={styles.card}>
        <List.Item
          title="Nombre"
          description={user.name || '—'}
          left={(props) => <List.Icon {...props} icon="account" />}
        />
        <Divider />
        <List.Item
          title="Email"
          description={user.email}
          left={(props) => <List.Icon {...props} icon="email" />}
        />
        <Divider />
        <List.Item
          title="Moneda"
          description={user.currency}
          left={(props) => <List.Icon {...props} icon="cash" />}
        />
      </Card>

      <Button
        mode="outlined"
        icon="logout"
        onPress={onLogout}
        loading={loggingOut}
        disabled={loggingOut}
        textColor={colors.error}
        style={[styles.logout, { borderColor: colors.error }]}
      >
        Cerrar sesión
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 12, marginBottom: 24 },
  card: { overflow: 'hidden' },
  logout: { marginTop: 24 },
});
