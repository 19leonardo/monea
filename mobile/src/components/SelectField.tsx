import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  HelperText,
  List,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SelectOption<T> = {
  value: T;
  label: string;
  description?: string;
  /** Icono de Material Design Icons. */
  icon?: string;
};

type Props<T> = {
  label: string;
  value: T | null | undefined;
  options: SelectOption<T>[];
  onChange: (value: T | null) => void;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  /** Mensaje si falló la carga de opciones, con botón para reintentar. */
  loadError?: string;
  onRetry?: () => void;
  /** Permite dejarlo vacío (añade la opción "Ninguno"). */
  optional?: boolean;
  icon?: string;
};

/**
 * Campo de selección: se ve como un TextInput y abre una hoja inferior con la
 * lista de opciones (con scroll, así sirve aunque haya muchas). El usuario ve
 * nombres; el formulario guarda el valor (id).
 */
export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  error,
  disabled = false,
  loading = false,
  loadError,
  onRetry,
  optional = false,
  icon,
}: Props<T>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value);
  const blocked = disabled || loading || !!loadError;

  const choose = (next: T | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={blocked}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'sin elegir'}`}
      >
        {/* pointerEvents none: el toque lo recibe el Pressable, no el input. */}
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label={label}
            value={loading ? 'Cargando…' : (selected?.label ?? '')}
            editable={false}
            disabled={blocked}
            error={!!error}
            left={icon || selected?.icon ? <TextInput.Icon icon={selected?.icon ?? icon!} /> : undefined}
            right={
              loading ? (
                <TextInput.Icon icon={() => <ActivityIndicator size={18} />} />
              ) : (
                <TextInput.Icon icon="menu-down" />
              )
            }
          />
        </View>
      </Pressable>

      {loadError ? (
        <View style={styles.loadError}>
          <HelperText type="error" visible style={styles.flex}>
            {loadError}
          </HelperText>
          {onRetry && (
            <Button compact onPress={onRetry}>
              Reintentar
            </Button>
          )}
        </View>
      ) : (
        <HelperText type="error" visible={!!error} style={styles.helper}>
          {error}
        </HelperText>
      )}

      <Portal>
        <Modal
          visible={open}
          onDismiss={() => setOpen(false)}
          style={styles.modal}
          contentContainerStyle={[
            styles.sheet,
            { backgroundColor: colors.surface, paddingBottom: 12 + insets.bottom },
          ]}
        >
          <Text variant="titleMedium" style={styles.sheetTitle}>
            {label}
          </Text>
          <FlatList
            data={options}
            keyExtractor={(option) => String(option.value)}
            ListHeaderComponent={
              optional ? (
                <List.Item
                  title="Ninguno"
                  left={(props) => <List.Icon {...props} icon="close-circle-outline" />}
                  onPress={() => choose(null)}
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
                  left={(props) =>
                    item.icon ? <List.Icon {...props} icon={item.icon} /> : null
                  }
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
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  helper: { minHeight: 24 },
  loadError: { flexDirection: 'row', alignItems: 'center', minHeight: 24 },
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
  },
  sheetTitle: { paddingHorizontal: 24, paddingBottom: 8, fontWeight: 'bold' },
  empty: { textAlign: 'center', padding: 24 },
});
