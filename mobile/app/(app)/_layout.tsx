import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/features/auth/auth.store';

// Grupo protegido: el layout raíz ya lo oculta con Stack.Protected; esta
// redirección es una segunda barrera por si se llega aquí sin sesión.
export default function AppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Monea' }} />
    </Stack>
  );
}
