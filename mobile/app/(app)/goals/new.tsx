import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateField } from '@/components/DateField';
import { FormTextInput } from '@/components/FormTextInput';
import { getApiErrorMessage } from '@/core/api/errors';
import { useFeedback } from '@/core/ui/feedback.store';
import { formatMoney, parseMoneyInput } from '@/core/utils/currency';
import { toISODate } from '@/core/utils/date';
import { type GoalForm, goalFormSchema, type GoalFormInput } from '@/features/goals/goals.schemas';
import { useCreateGoal } from '@/features/goals/useGoals';

/** Fecha sugerida al activar la fecha objetivo: dentro de 6 meses. */
function defaultTargetDate(): string {
  const today = new Date();
  return toISODate(new Date(today.getFullYear(), today.getMonth() + 6, today.getDate()));
}

export default function NewGoalScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const createGoal = useCreateGoal();
  const showMessage = useFeedback((state) => state.showMessage);
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<GoalFormInput, unknown, GoalForm>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: { name: '', targetAmount: '', targetDate: null, description: '' },
  });

  const saving = createGoal.isPending;

  const onSubmit = handleSubmit(async ({ name, targetAmount, targetDate, description }) => {
    setServerError(null);
    try {
      const goal = await createGoal.mutateAsync({
        name,
        // Texto decimal ("8000.00"), nunca float.
        target_amount: parseMoneyInput(targetAmount)!,
        target_date: targetDate,
        description: description || null,
      });
      showMessage(`Meta "${goal.name}" creada: ${formatMoney(goal.target_amount)}`);
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
            label="Nombre de la meta"
            placeholder="Ej.: Viaje a Cusco, Fondo de emergencia"
            autoCapitalize="sentences"
            disabled={saving}
          />

          <FormTextInput
            control={control}
            name="targetAmount"
            label="¿Cuánto quieres ahorrar?"
            placeholder="0,00"
            keyboardType="decimal-pad"
            left={<TextInput.Affix text="Bs" />}
            disabled={saving}
          />

          <Controller
            control={control}
            name="targetDate"
            render={({ field: { value, onChange }, fieldState: { error } }) =>
              value === null ? (
                <Button
                  mode="outlined"
                  icon="calendar-plus"
                  onPress={() => onChange(defaultTargetDate())}
                  disabled={saving}
                  style={styles.addDate}
                >
                  Agregar fecha objetivo (opcional)
                </Button>
              ) : (
                <View style={styles.dateRow}>
                  <View style={styles.flex}>
                    <DateField
                      label="Fecha objetivo"
                      value={value}
                      onChange={onChange}
                      error={error?.message}
                      disabled={saving}
                      minimumDate={new Date()}
                    />
                  </View>
                  <IconButton
                    icon="close"
                    onPress={() => onChange(null)}
                    disabled={saving}
                    accessibilityLabel="Quitar fecha objetivo"
                    style={styles.removeDate}
                  />
                </View>
              )
            }
          />
          <Text variant="bodySmall" style={[styles.hint, { color: colors.onSurfaceVariant }]}>
            Con una fecha objetivo, Monea calcula cuánto ahorrar cada mes.
          </Text>

          <FormTextInput
            control={control}
            name="description"
            label="Descripción (opcional)"
            multiline
            maxLength={255}
            disabled={saving}
          />

          <Button
            mode="contained"
            onPress={onSubmit}
            loading={saving}
            disabled={saving}
            style={styles.save}
            contentStyle={styles.saveContent}
          >
            Crear meta
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
  addDate: { marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-start' },
  removeDate: { marginTop: 10 },
  hint: { marginBottom: 16 },
  save: { marginTop: 8 },
  saveContent: { paddingVertical: 6 },
});
