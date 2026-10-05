import { FlatList, StyleSheet } from 'react-native';
import { List, Modal, Portal, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SelectOption<T> = {
  value: T;
  label: string;
  description?: string;
  /** Icono de Material Design Icons. */
  icon?: string;
};

type Props<T> = {
  visible: boolean;
  title: string;
  options: SelectOption<T>[];
  value: T | null | undefined;
  onSelect: (value: T | null) => void;
  onDismiss: () => void;
  /** Texto de la primera opción que deja el valor vacío (p. ej. "Ninguno", "Todas"). */
  emptyOptionLabel?: string;
};

/** Hoja inferior con una lista de opciones desplazable (sirve aunque haya muchas). */
export function OptionSheet<T extends string | number>({
  visible,
  title,
  options,
  value,
  onSelect,
  onDismiss,
  emptyOptionLabel,
}: Props<T>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const choose = (next: T | null) => {
    onSelect(next);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        style={styles.modal}
        contentContainerStyle={[
          styles.sheet,
          { backgroundColor: colors.surface, paddingBottom: 12 + insets.bottom },
        ]}
      >
        <Text variant="titleMedium" style={styles.title}>
          {title}
        </Text>
        <FlatList
          data={options}
          keyExtractor={(option) => String(option.value)}
          ListHeaderComponent={
            emptyOptionLabel ? (
              <List.Item
                title={emptyOptionLabel}
                onPress={() => choose(null)}
                style={value == null && { backgroundColor: colors.secondaryContainer }}
                left={(props) => <List.Icon {...props} icon="close-circle-outline" />}
                right={(props) =>
                  value == null ? <List.Icon {...props} icon="check" color={colors.primary} /> : null
                }
              />
            ) : null
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.onSurfaceVariant }]}>
              No hay opciones disponibles
            </Text>
          }
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            return (
              <List.Item
                title={item.label}
                description={item.description}
                onPress={() => choose(item.value)}
                style={isSelected && { backgroundColor: colors.secondaryContainer }}
                left={(props) => (item.icon ? <List.Icon {...props} icon={item.icon} /> : null)}
                right={(props) =>
                  isSelected ? <List.Icon {...props} icon="check" color={colors.primary} /> : null
                }
                accessibilityState={{ selected: isSelected }}
              />
            );
          }}
        />
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
  },
  title: { paddingHorizontal: 24, paddingBottom: 8, fontWeight: 'bold' },
  empty: { textAlign: 'center', padding: 24 },
});
