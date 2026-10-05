import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  IconButton,
  Menu,
  ProgressBar,
  Text,
  useTheme,
} from 'react-native-paper';

import { formatMoney, formatPercent, toCents } from '@/core/utils/currency';
import { formatDateLabel } from '@/core/utils/date';
import { moneyColors } from '@/theme';

import type { Goal } from '../goals.types';

const SUCCESS_CONTAINER = '#E3F4E4';

type Props = {
  goal: Goal;
  onContribute: (goal: Goal) => void;
  onToggleCancel: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
};

export function GoalCard({ goal, onContribute, onToggleCancel, onDelete }: Props) {
  const { colors } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const completed = goal.status === 'completada';
  const cancelled = goal.status === 'cancelada';
  // progress llega como texto ("43.75"); en centavos de porcentaje para no usar float.
  const progress = Math.min(toCents(goal.progress), 100_00) / 100_00;
  const barColor = completed ? moneyColors.income : colors.primary;

  return (
    <Card
      mode={completed ? 'contained' : 'elevated'}
      style={[
        styles.card,
        completed && { backgroundColor: SUCCESS_CONTAINER },
        cancelled && styles.cancelled,
      ]}
    >
      <Card.Title
        title={goal.name}
        titleVariant="titleMedium"
        subtitle={
          completed
            ? '¡Meta completada!'
            : cancelled
              ? 'Cancelada'
              : goal.target_date
                ? `Hasta el ${formatDateLabel(goal.target_date)}`
                : 'Sin fecha objetivo'
        }
        subtitleStyle={completed && { color: moneyColors.income, fontWeight: 'bold' }}
        left={(props) => (
          <Avatar.Icon
            {...props}
            icon={completed ? 'check-bold' : cancelled ? 'cancel' : 'piggy-bank'}
            color={completed ? '#FFFFFF' : colors.onPrimaryContainer}
            style={{ backgroundColor: completed ? moneyColors.income : colors.primaryContainer }}
          />
        )}
        right={() => (
          <Menu
            visible={menuOpen}
            onDismiss={() => setMenuOpen(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                onPress={() => setMenuOpen(true)}
                accessibilityLabel={`Opciones de ${goal.name}`}
              />
            }
          >
            {!completed && (
              <Menu.Item
                leadingIcon={cancelled ? 'restore' : 'cancel'}
                title={cancelled ? 'Reactivar meta' : 'Cancelar meta'}
                onPress={() => {
                  setMenuOpen(false);
                  onToggleCancel(goal);
                }}
              />
            )}
            <Menu.Item
              leadingIcon="delete-outline"
              title="Eliminar"
              onPress={() => {
                setMenuOpen(false);
                onDelete(goal);
              }}
            />
          </Menu>
        )}
      />

      <Card.Content style={styles.content}>
        {goal.description ? (
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {goal.description}
          </Text>
        ) : null}

        <ProgressBar
          progress={progress}
          color={barColor}
          style={[styles.bar, { backgroundColor: colors.surfaceVariant }]}
          accessibilityLabel={`${formatPercent(goal.progress)} ahorrado`}
        />
        <View style={styles.row}>
          <Text variant="bodyMedium" style={styles.flex}>
            {formatMoney(goal.current_amount)} de {formatMoney(goal.target_amount)}
          </Text>
          <Text variant="titleSmall" style={[styles.bold, { color: barColor }]}>
            {formatPercent(goal.progress)}
          </Text>
        </View>

        {!completed && (
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            Faltan: {formatMoney(goal.remaining)}
          </Text>
        )}
        {goal.recommended_monthly !== null && (
          <Text variant="bodyMedium" style={{ color: colors.primary }}>
            Ahorro recomendado: {formatMoney(goal.recommended_monthly)}/mes
          </Text>
        )}
      </Card.Content>

      {!completed && !cancelled && (
        <Card.Actions>
          <Button mode="contained" icon="plus" onPress={() => onContribute(goal)}>
            Aportar
          </Button>
        </Card.Actions>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  cancelled: { opacity: 0.6 },
  content: { gap: 6 },
  bar: { height: 10, borderRadius: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  bold: { fontWeight: 'bold' },
});
