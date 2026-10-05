import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormTextInput } from '@/components/FormTextInput';
import { MonthSelector } from '@/components/MonthSelector';
import { type SelectOption, SelectField } from '@/components/SelectField';
import { getApiErrorMessage, getApiErrorStatus } from '@/core/api/errors';
import { useFeedback } from '@/core/ui/feedback.store';
import { formatMoney, parseMoneyInput } from '@/core/utils/currency';
import { currentMonth, formatMonthLabel } from '@/core/utils/date';
import {
  type BudgetForm,
  budgetFormSchema,
  type BudgetFormInput,
} from '@/features/budgets/budgets.schemas';
import { useCreateBudget } from '@/features/budgets/useBudgets';
import { useCategories } from '@/features/categories/useCategories';

export default function NewBudgetScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ month?: string }>();
  const createBudget = useCreateBudget();
  const categories = useCategories('gasto');
  const showMessage = useFeedback((state) => state.showMessage);
  const [serverError, setServerError] = useState<string | null>(null);

  const initialMonth =
    params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : currentMonth();

  const { control, handleSubmit, setError } = useForm<BudgetFormInput, unknown, BudgetForm>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: { categoryId: undefined, amount: '', month: initialMonth },
  });

  const saving = createBudget.isPending;

  const categoryOptions: SelectOption<number>[] = (categories.data ?? []).map((category) => ({
    value: category.id,
    label: category.name,
    icon: category.icon,
  }));

  const onSubmit = handleSubmit(async ({ categoryId, amount, month }) => {
    setServerError(null);
    try {
      const budget = await createBudget.mutateAsync({
        category_id: categoryId,
        // Texto decimal ("800.00"), nunca float.
        amount: parseMoneyInput(amount)!,
        month,
      });
      showMessage(
        `Presupuesto de ${budget.category_name}: ${formatMoney(budget.amount)} en ` +
          formatMonthLabel(budget.month),
      );
      router.back();
    } catch (error) {
      if (getApiErrorStatus(error) === 409) {
        // Error junto al campo que lo causa, no solo en el Snackbar.
        setError('categoryId', {
          message: `Ya tienes un presupuesto para esta categoría en ${formatMonthLabel(month)}`,
        });
      } else {
        setServerError(getApiErrorMessage(error));
      }
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
          <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
            Mes
          </Text>
          <Controller
            control={control}
            name="month"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <View style={styles.monthBlock}>
                <MonthSelector value={value} onChange={onChange} disabled={saving} />
                <HelperText type="error" visible={!!error}>
                  {error?.message}
                </HelperText>
              </View>
            )}
          />

          <Controller
            control={control}
            name="categoryId"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <SelectField
                label="Categoría de gasto"
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

          <FormTextInput
            control={control}
            name="amount"
            label="Tope del mes"
            placeholder="0,00"
            keyboardType="decimal-pad"
            left={<TextInput.Affix text="Bs" />}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            disabled={saving}
          />
          <Text variant="bodySmall" style={[styles.hint, { color: colors.onSurfaceVariant }]}>
            Te avisaremos al llegar al 70 %, 90 % y 100 % del tope.
          </Text>

          <Button
            mode="contained"
            onPress={onSubmit}
            loading={saving}
            disabled={saving}
            style={styles.save}
            contentStyle={styles.saveContent}
          >
            Guardar presupuesto
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
  label: { textAlign: 'center' },
  monthBlock: { alignItems: 'center' },
  hint: { marginTop: -16, marginBottom: 16 },
  save: { marginTop: 8 },
  saveContent: { paddingVertical: 6 },
});
