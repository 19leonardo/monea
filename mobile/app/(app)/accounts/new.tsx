import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormTextInput } from '@/components/FormTextInput';
import { getApiErrorMessage } from '@/core/api/errors';
import { parseMoneyInput } from '@/core/utils/currency';
import { type AccountForm, accountFormSchema } from '@/features/accounts/accounts.schemas';
import { ACCOUNT_TYPE_INFO, ACCOUNT_TYPES } from '@/features/accounts/accounts.types';
import { useCreateAccount } from '@/features/accounts/useAccounts';

export default function NewAccountScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const createAccount = useCreateAccount();
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<AccountForm>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { name: '', type: undefined, initialBalance: '' },
  });

  const saving = createAccount.isPending;

  const onSubmit = handleSubmit(async ({ name, type, initialBalance }) => {
    setServerError(null);
    try {
      await createAccount.mutateAsync({
        name,
        type,
        // Se envía como texto decimal ("1234.50"), nunca como float.
        initial_balance: parseMoneyInput(initialBalance) ?? '0.00',
      });
      // La lista se invalida en onSuccess y se recarga sola al volver.
      router.back();
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    }
  });

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <FormTextInput
            control={control}
            name="name"
            label="Nombre"
            placeholder="Ej.: Banco Unión, Billetera"
            autoCapitalize="sentences"
            disabled={saving}
          />

          <Text variant="titleSmall" style={styles.label}>
            Tipo de cuenta
          </Text>
          <Controller
            control={control}
            name="type"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <View>
                <View style={styles.chips}>
                  {ACCOUNT_TYPES.map((type) => (
                    <Chip
                      key={type}
                      icon={ACCOUNT_TYPE_INFO[type].icon}
                      selected={value === type}
                      showSelectedOverlay
                      onPress={() => onChange(type)}
                      disabled={saving}
                      accessibilityState={{ selected: value === type }}
                    >
                      {ACCOUNT_TYPE_INFO[type].label}
                    </Chip>
                  ))}
                </View>
                <HelperText type="error" visible={!!error}>
                  {error?.message}
                </HelperText>
              </View>
            )}
          />

          <FormTextInput
            control={control}
            name="initialBalance"
            label="Saldo inicial"
            placeholder="0,00"
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
            left={<TextInput.Affix text="Bs" />}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            disabled={saving}
          />
          <Text variant="bodySmall" style={[styles.hint, { color: colors.onSurfaceVariant }]}>
            Si lo dejas vacío empieza en 0. Para una tarjeta de crédito con deuda, usa un monto
            negativo.
          </Text>

          <Button
            mode="contained"
            onPress={onSubmit}
            loading={saving}
            disabled={saving}
            style={styles.save}
            contentStyle={styles.saveContent}
          >
            Guardar cuenta
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={!!serverError}
        onDismiss={() => setServerError(null)}
        duration={5000}
        action={{ label: 'OK', onPress: () => setServerError(null) }}
        wrapperStyle={{ bottom: insets.bottom }}
      >
        {serverError}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 24 },
  label: { marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { marginTop: -16, marginBottom: 16 },
  save: { marginTop: 8 },
  saveContent: { paddingVertical: 6 },
});
