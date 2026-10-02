import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import type { ColorValue } from 'react-native';
import { Portal, Snackbar, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddTabButton } from '@/components/AddTabButton';
import { AddTransactionSheet } from '@/components/AddTransactionSheet';
import { useAuthStore } from '@/features/auth/auth.store';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

function tabIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <MaterialCommunityIcons name={name} color={color} size={size} />
  );
}

// Altura aproximada de la barra para que el Snackbar quede por encima de ella.
const TAB_BAR_HEIGHT = 56;

// Grupo protegido: el layout raíz ya lo oculta con Stack.Protected; esta
// redirección es una segunda barrera por si se llega aquí sin sesión.
export default function AppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const openSheet = () => setSheetVisible(true);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.onSurfaceVariant,
          tabBarStyle: {
            backgroundColor: colors.elevation.level2,
            borderTopColor: colors.outlineVariant,
          },
          tabBarLabelStyle: { fontSize: 12 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: tabIcon('home') }} />
        <Tabs.Screen
          name="statistics"
          options={{ title: 'Estadísticas', tabBarIcon: tabIcon('chart-bar') }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: 'Registrar',
            tabBarButton: () => <AddTabButton onPress={openSheet} />,
          }}
          listeners={{
            // El ➕ no navega: abre la hoja "Registrar".
            tabPress: (event) => {
              event.preventDefault();
              openSheet();
            },
          }}
        />
        <Tabs.Screen name="goals" options={{ title: 'Metas', tabBarIcon: tabIcon('flag') }} />
        <Tabs.Screen
          name="profile"
          options={{ title: 'Perfil', tabBarIcon: tabIcon('account') }}
        />
      </Tabs>

      <AddTransactionSheet
        visible={sheetVisible}
        onDismiss={() => setSheetVisible(false)}
        onSelect={() => {
          setSheetVisible(false);
          setMessage('Formulario en construcción (Paso 3)');
        }}
      />

      <Portal>
        <Snackbar
          visible={!!message}
          onDismiss={() => setMessage(null)}
          duration={3000}
          wrapperStyle={{ bottom: TAB_BAR_HEIGHT + insets.bottom }}
        >
          {message}
        </Snackbar>
      </Portal>
    </>
  );
}
