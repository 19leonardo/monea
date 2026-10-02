import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';

export default function GoalsScreen() {
  const { colors } = useTheme();

  return (
    <Screen title="Metas" centered>
      <MaterialCommunityIcons name="flag" size={64} color={colors.primary} />
      <Text variant="titleMedium" style={{ color: colors.onSurfaceVariant }}>
        Próximamente
      </Text>
    </Screen>
  );
}
