import { useQuery } from '@tanstack/react-query';
import { Text, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { getMe } from '@/features/auth/auth.api';
import { useAuthStore } from '@/features/auth/auth.store';

export default function HomeScreen() {
  const { colors } = useTheme();
  const sessionUser = useAuthStore((state) => state.user);

  // Parte de los datos cargados al iniciar sesión y los refresca desde /users/me.
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    initialData: sessionUser ?? undefined,
  });

  return (
    <Screen title="Inicio" centered>
      <Text variant="headlineSmall" style={{ textAlign: 'center' }}>
        Hola, {user?.name || user?.email}
      </Text>
      <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
        Aquí irá tu resumen financiero
      </Text>
    </Screen>
  );
}
