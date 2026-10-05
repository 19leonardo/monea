import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, HelperText, TextInput } from 'react-native-paper';

import { OptionSheet, type SelectOption } from './OptionSheet';

export type { SelectOption };

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
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value);
  const blocked = disabled || loading || !!loadError;

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

      <OptionSheet
        visible={open}
        title={label}
        options={options}
        value={value}
        onSelect={onChange}
        onDismiss={() => setOpen(false)}
        emptyOptionLabel={optional ? 'Ninguno' : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  helper: { minHeight: 24 },
  loadError: { flexDirection: 'row', alignItems: 'center', minHeight: 24 },
});
