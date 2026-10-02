import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

type Props = {
  onPress: () => void;
};

/** Botón central ➕ de la barra de pestañas: redondo, color primario, sobresale de la barra. */
export function AddTabButton({ onPress }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.slot}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Registrar movimiento"
        android_ripple={{ color: colors.onPrimary, borderless: true, radius: 30 }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary, shadowColor: colors.shadow },
          pressed && styles.pressed,
        ]}
      >
        <MaterialCommunityIcons name="plus" size={32} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const SIZE = 60;

const styles = StyleSheet.create({
  slot: { flex: 1, alignItems: 'center' },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Sobresale por encima de la barra.
    marginTop: -SIZE / 3,
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
