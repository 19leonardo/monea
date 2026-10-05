import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import type { ColorValue } from 'react-native';
import { Portal, Snackbar, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddTabButton } from '@/components/AddTabButton';
import { AddTransactionSheet } from '@/components/AddTransactionSheet';
import { useFeedback } from '@/core/ui/feedback.store';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

function tabIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <MaterialCommunityIcons name={name} color={color} size={size} />
  );
}

// Altura aproximada de la barra para que el Snackbar quede por encima de ella.
const TAB_BAR_HEIGHT = 56;

// Barra inferior. La protección de sesión vive en app/(app)/_layout.tsx.
export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sheetVisible, setSheetVisible] = useState(false);
  const { message, clearMessage } = useFeedback();

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
        onSelect={(kind) => {
          setSheetVisible(false);
          router.push(kind === 'GASTO' ? '/add/gasto' : '/add/ingreso');
        }}
      />

      {/* Mensajes globales (p. ej. "Gasto registrado" al volver del formulario). */}
      <Portal>
        <Snackbar
          visible={!!message}
          onDismiss={clearMessage}
          duration={3000}
          wrapperStyle={{ bottom: TAB_BAR_HEIGHT + insets.bottom }}
        >
          {message}
        </Snackbar>
      </Portal>
    </>
  );
}
