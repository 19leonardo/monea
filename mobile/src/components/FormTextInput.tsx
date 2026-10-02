import { useState } from 'react';
import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput, type TextInputProps } from 'react-native-paper';

type Props<T extends FieldValues> = Omit<TextInputProps, 'value' | 'onChangeText' | 'error'> & {
  control: Control<T>;
  name: Path<T>;
  /** Campo de contraseña: oculto, con botón para mostrarlo. */
  secret?: boolean;
};

/** TextInput de Paper conectado a react-hook-form, con el error debajo. */
export function FormTextInput<T extends FieldValues>({
  control,
  name,
  secret = false,
  ...inputProps
}: Props<T>) {
  const [hidden, setHidden] = useState(true);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <View>
          <TextInput
            mode="outlined"
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            error={!!error}
            secureTextEntry={secret && hidden}
            autoCapitalize={secret ? 'none' : inputProps.autoCapitalize}
            autoCorrect={secret ? false : inputProps.autoCorrect}
            right={
              secret ? (
                <TextInput.Icon
                  icon={hidden ? 'eye' : 'eye-off'}
                  onPress={() => setHidden((h) => !h)}
                  accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
                />
              ) : undefined
            }
            {...inputProps}
          />
          <HelperText type="error" visible={!!error} style={styles.helper}>
            {error?.message}
          </HelperText>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  helper: { minHeight: 24 },
});
