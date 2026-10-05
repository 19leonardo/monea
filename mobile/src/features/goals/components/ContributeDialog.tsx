import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, Dialog, HelperText, Portal, Text, TextInput, useTheme } from 'react-native-paper';

import { getApiErrorMessage } from '@/core/api/errors';
import { formatMoney, parseMoneyInput } from '@/core/utils/currency';

import { type ContributionForm, contributionFormSchema } from '../goals.schemas';
import type { Goal } from '../goals.types';
import { useContribute } from '../useGoals';

type Props = {
  /** Meta a la que se aporta; null = diálogo cerrado. */
  goal: Goal | null;
  onDismiss: () => void;
  onSuccess: (updated: Goal, amount: string) => void;
};

/** Diálogo "Aportar": monto (Bs) → POST /goals/{id}/contributions. */
export function ContributeDialog({ goal, onDismiss, onSuccess }: Props) {
  const { colors } = useTheme();
  const contribute = useContribute();
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<ContributionForm>({
    resolver: zodResolver(contributionFormSchema),
    defaultValues: { amount: '' },
  });

  // Cada vez que se abre para una meta, empieza limpio.
  useEffect(() => {
    if (goal) {
      reset({ amount: '' });
      setServerError(null);
    }
  }, [goal, reset]);

  const saving = contribute.isPending;

  const onSubmit = handleSubmit(async ({ amount }) => {
    if (!goal) return;
    setServerError(null);
    const value = parseMoneyInput(amount)!; // ya validado por zod
    try {
      const updated = await contribute.mutateAsync({ id: goal.id, data: { amount: value } });
      onSuccess(updated, value);
    } catch (error) {
      setServerError(
        getApiErrorMessage(error, { 404: 'Esta meta ya no existe. Desliza para actualizar.' }),
      );
    }
  });

  return (
    <Portal>
      <Dialog visible={!!goal} onDismiss={saving ? undefined : onDismiss}>
        <Dialog.Title>Aportar a {goal?.name}</Dialog.Title>
        <Dialog.Content>
          {goal && (
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              Faltan {formatMoney(goal.remaining)} para llegar a {formatMoney(goal.target_amount)}.
            </Text>
          )}
          <Controller
            control={control}
            name="amount"
            render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
              <>
                <TextInput
                  mode="outlined"
                  label="Monto"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="0,00"
                  keyboardType="decimal-pad"
                  autoFocus
                  disabled={saving}
                  error={!!error || !!serverError}
                  left={<TextInput.Affix text="Bs" />}
                  returnKeyType="done"
                  onSubmitEditing={onSubmit}
                  style={{ marginTop: 12 }}
                />
                <HelperText type="error" visible={!!error || !!serverError}>
                  {error?.message ?? serverError}
                </HelperText>
              </>
            )}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={saving}>
            Cancelar
          </Button>
          <Button mode="contained" onPress={onSubmit} loading={saving} disabled={saving}>
            Aportar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
