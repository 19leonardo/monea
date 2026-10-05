import { Redirect, Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

import { useAuthStore } from '@/features/auth/auth.store';

// Grupo protegido: el layout raíz ya lo oculta con Stack.Protected; esta
// redirección es una segunda barrera por si se llega aquí sin sesión.
// Stack sobre las pestañas: las pantallas de detalle (Cuentas, Nueva cuenta)
// se abren encima de la barra inferior, con botón atrás.
export default function AppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { colors } = useTheme();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="accounts/index" options={{ title: 'Cuentas' }} />
      <Stack.Screen name="transactions" options={{ title: 'Movimientos' }} />
      <Stack.Screen
        name="accounts/new"
        options={{ title: 'Nueva cuenta', presentation: 'modal' }}
      />
      {/* El título ("Nuevo gasto" / "Nuevo ingreso") lo fija la propia pantalla. */}
      <Stack.Screen name="add/[type]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
