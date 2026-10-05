import { MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  HelperText,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateField } from '@/components/DateField';
import { FormTextInput } from '@/components/FormTextInput';
import { type SelectOption, SelectField } from '@/components/SelectField';
import { getApiErrorMessage } from '@/core/api/errors';
import { useFeedback } from '@/core/ui/feedback.store';
import { formatMoney, parseMoneyInput } from '@/core/utils/currency';
import { todayISO } from '@/core/utils/date';
import { ACCOUNT_TYPE_INFO } from '@/features/accounts/accounts.types';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useCategories } from '@/features/categories/useCategories';
import { PAYMENT_METHOD_ICONS } from '@/features/payment-methods/payment-methods.types';
import { usePaymentMethods } from '@/features/payment-methods/usePaymentMethods';
import {
  type TransactionForm,
  transactionFormSchema,
  type TransactionFormInput,
} from '@/features/transactions/transactions.schemas';
import {
  TRANSACTION_KIND,
  type TransactionKindParam,
} from '@/features/transactions/transactions.types';
import { useCreateTransaction } from '@/features/transactions/useTransactions';

function isKind(value: unknown): value is TransactionKindParam {
  return value === 'gasto' || value === 'ingreso';
}

export default function AddTransactionScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { colors } = useTheme();

  if (!isKind(type)) {
    return (
      <Centered>
        <Stack.Screen options={{ title: 'Registrar' }} />
        <Text variant="titleMedium">Tipo de movimiento no válido</Text>
        <Button mode="contained" onPress={() => router.back()}>
          Volver
        </Button>
      </Centered>
    );
  }

  return <TransactionFormScreen kind={type} accent={type === 'gasto' ? colors.error : colors.primary} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>{children}</View>
  );
}

function TransactionFormScreen({ kind, accent }: { kind: TransactionKindParam; accent: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { title, saveLabel, type } = TRANSACTION_KIND[kind];
  const showMessage = useFeedback((state) => state.showMessage);

  const accounts = useAccounts();
  const categories = useCategories(kind);
  const paymentMethods = usePaymentMethods();
  const createTransaction = useCreateTransaction();
  const [serverError, setServerError] = useState<string | null>(null);

  const activeAccounts = useMemo(
    () => (accounts.data ?? []).filter((account) => account.is_active),
    [accounts.data],
  );

  const { control, handleSubmit, setValue, getValues } = useForm<
    TransactionFormInput,
    unknown,
    TransactionForm
  >({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      amount: '',
      accountId: undefined,
      categoryId: undefined,
      paymentMethodId: null,
      date: todayISO(),
      description: '',
    },
  });

  // Con una sola cuenta activa, se elige sola.
  useEffect(() => {
    if (activeAccounts.length === 1 && getValues('accountId') === undefined) {
      setValue('accountId', activeAccounts[0].id);
    }
  }, [activeAccounts, getValues, setValue]);

  const saving = createTransaction.isPending;

  const onSubmit = handleSubmit(async (form) => {
    setServerError(null);
    const amount = parseMoneyInput(form.amount)!; // ya validado por zod
    try {
      const transaction = await createTransaction.mutateAsync({
        type,
        amount,
        account_id: form.accountId,
        category_id: form.categoryId,
        payment_method_id: form.paymentMethodId,
        date: form.date,
        description: form.description || null,
      });
      showMessage(
        `${kind === 'gasto' ? 'Gasto' : 'Ingreso'} de ${formatMoney(transaction.amount)} ` +
          `registrado en ${transaction.account_name}`,
      );
      router.back();
    } catch (error) {
      setServerError(
        getApiErrorMessage(error, {
          404: 'La cuenta, categoría o método de pago elegido ya no está disponible. ' +
            'Vuelve a elegirlo.',
        }),
      );
    }
  });

  // --- Estados de la carga de cuentas ---------------------------------------

  if (accounts.isPending) {
    return (
      <Centered>
        <Stack.Screen options={{ title }} />
        <ActivityIndicator size="large" />
      </Centered>
    );
  }

  if (accounts.isError) {
    return (
      <Centered>
        <Stack.Screen options={{ title }} />
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
        <Text variant="titleMedium">No se pudieron cargar tus cuentas</Text>
        <Text style={[styles.muted, { color: colors.onSurfaceVariant }]}>
          {getApiErrorMessage(accounts.error)}
        </Text>
        <Button mode="contained" onPress={() => accounts.refetch()}>
          Reintentar
        </Button>
      </Centered>
    );
  }

  if (activeAccounts.length === 0) {
    return (
      <Centered>
        <Stack.Screen options={{ title }} />
        <MaterialCommunityIcons name="wallet-plus-outline" size={64} color={colors.primary} />
        <Text variant="titleLarge">Primero crea una cuenta</Text>
        <Text variant="bodyMedium" style={[styles.muted, { color: colors.onSurfaceVariant }]}>
          Para registrar un {kind} necesitas al menos una cuenta (efectivo, banco, tarjeta…).
        </Text>
        <Button mode="contained" icon="plus" onPress={() => router.push('/accounts/new')}>
          Crear cuenta
        </Button>
      </Centered>
    );
  }

  // --- Opciones de los selectores (nombres a la vista, ids por detrás) -------

  const accountOptions: SelectOption<number>[] = activeAccounts.map((account) => ({
    value: account.id,
    label: account.name,
    description: `Saldo: ${formatMoney(account.balance, account.currency)}`,
    icon: ACCOUNT_TYPE_INFO[account.type]?.icon ?? 'wallet',
  }));
  const categoryOptions: SelectOption<number>[] = (categories.data ?? []).map((category) => ({
    value: category.id,
    label: category.name,
    icon: category.icon,
  }));
  const paymentMethodOptions: SelectOption<number>[] = (paymentMethods.data ?? []).map(
    (method) => ({
      value: method.id,
      label: method.name,
      icon: PAYMENT_METHOD_ICONS[method.type] ?? 'cash',
    }),
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Monto: el campo principal, grande y destacado. */}
          <Controller
            control={control}
            name="amount"
            render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
              <View style={styles.amountBlock}>
                <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
                  Monto
                </Text>
                <TextInput
                  mode="flat"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="0,00"
                  keyboardType="decimal-pad"
                  autoFocus
                  disabled={saving}
                  error={!!error}
                  underlineColor="transparent"
                  activeUnderlineColor={accent}
                  textColor={accent}
                  style={[styles.amountInput, { backgroundColor: 'transparent' }]}
                  contentStyle={styles.amountContent}
                  left={
                    <TextInput.Affix
                      text="Bs"
                      textStyle={[styles.amountPrefix, { color: accent }]}
                    />
                  }
                  accessibilityLabel="Monto en bolivianos"
                />
                <HelperText type="error" visible={!!error} style={styles.amountHelper}>
                  {error?.message}
                </HelperText>
              </View>
            )}
          />

          <Controller
            control={control}
            name="accountId"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <SelectField
                label="Cuenta"
                icon="wallet"
                value={value}
                options={accountOptions}
                onChange={(next) => onChange(next ?? undefined)}
                error={error?.message}
                disabled={saving}
              />
            )}
          />

          <Controller
            control={control}
            name="categoryId"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <SelectField
                label="Categoría"
                icon="shape"
                value={value}
                options={categoryOptions}
                onChange={(next) => onChange(next ?? undefined)}
                error={error?.message}
                disabled={saving}
                loading={categories.isPending}
                loadError={
                  categories.isError
                    ? `No se pudieron cargar las categorías: ${getApiErrorMessage(categories.error)}`
                    : undefined
                }
                onRetry={() => categories.refetch()}
              />
            )}
          />

          <Controller
            control={control}
            name="paymentMethodId"
            render={({ field: { value, onChange } }) => (
              <SelectField
                label="Método de pago (opcional)"
                icon="credit-card-outline"
                value={value}
                options={paymentMethodOptions}
                onChange={onChange}
                optional
                disabled={saving}
                loading={paymentMethods.isPending}
                loadError={
                  paymentMethods.isError
                    ? `No se pudieron cargar los métodos: ${getApiErrorMessage(paymentMethods.error)}`
                    : undefined
                }
                onRetry={() => paymentMethods.refetch()}
              />
            )}
          />

          <Controller
            control={control}
            name="date"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <DateField
                label="Fecha"
                value={value}
                onChange={onChange}
                error={error?.message}
                disabled={saving}
                maximumDate={new Date()}
              />
            )}
          />

          <FormTextInput
            control={control}
            name="description"
            label="Descripción (opcional)"
            placeholder={kind === 'gasto' ? 'Ej.: Almuerzo con amigos' : 'Ej.: Pago de octubre'}
            multiline
            maxLength={255}
            disabled={saving}
          />

          <Button
            mode="contained"
            onPress={onSubmit}
            loading={saving}
            disabled={saving}
            buttonColor={accent}
            style={styles.save}
            contentStyle={styles.saveContent}
          >
            {saveLabel}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={!!serverError}
        onDismiss={() => setServerError(null)}
        duration={6000}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { textAlign: 'center' },
  content: { padding: 24 },
  amountBlock: { alignItems: 'center', marginBottom: 8 },
  amountInput: { alignSelf: 'stretch' },
  amountContent: { fontSize: 40, fontWeight: 'bold', textAlign: 'center' },
  amountPrefix: { fontSize: 28, fontWeight: 'bold' },
  amountHelper: { alignSelf: 'stretch', textAlign: 'center' },
  save: { marginTop: 8 },
  saveContent: { paddingVertical: 6 },
});
