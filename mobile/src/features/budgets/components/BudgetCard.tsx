import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Card, IconButton, Menu, ProgressBar, Text, useTheme } from 'react-native-paper';

import { centsToDecimal, formatMoney, toCents } from '@/core/utils/currency';

import { budgetColor } from '../budgetColors';
import type { Budget } from '../budgets.types';

type Props = {
  budget: Budget;
  onDelete: (budget: Budget) => void;
};

export function BudgetCard({ budget, onDelete }: Props) {
  const { colors } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const color = budgetColor(budget.percentage);
  const exceeded = budget.percentage >= 100;
  const overBy = toCents(budget.available) < 0;

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title
        title={budget.category_name}
        titleVariant="titleMedium"
        left={(props) => (
          <Avatar.Icon
            {...props}
            icon={budget.category_icon || 'tag'}
            color={color}
            style={{ backgroundColor: colors.surfaceVariant }}
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
                accessibilityLabel={`Opciones de ${budget.category_name}`}
              />
            }
          >
            <Menu.Item
              leadingIcon="delete-outline"
              title="Eliminar"
              onPress={() => {
                setMenuOpen(false);
                onDelete(budget);
              }}
            />
          </Menu>
        )}
      />
      <Card.Content style={styles.content}>
        <ProgressBar
          progress={Math.min(budget.percentage, 100) / 100}
          color={color}
          style={[styles.bar, { backgroundColor: colors.surfaceVariant }]}
          accessibilityLabel={`${budget.percentage} % usado`}
        />
        <View style={styles.row}>
          <Text variant="bodyMedium">
            {formatMoney(budget.spent)} de {formatMoney(budget.amount)}
          </Text>
          <Text variant="titleSmall" style={[styles.percentage, { color }]}>
            {budget.percentage} %
          </Text>
        </View>
        <Text
          variant="bodyMedium"
          style={{ color: overBy ? colors.error : colors.onSurfaceVariant }}
        >
          {overBy
            ? `Excedido por ${formatMoney(centsToDecimal(-toCents(budget.available)))}`
            : `Disponible: ${formatMoney(budget.available)}`}
        </Text>
        {exceeded && (
          <View style={[styles.alert, { backgroundColor: colors.errorContainer }]}>
            <Avatar.Icon
              size={24}
              icon="alert"
              color={colors.onErrorContainer}
              style={{ backgroundColor: 'transparent' }}
            />
            <Text variant="labelLarge" style={{ color: colors.onErrorContainer }}>
              Presupuesto superado
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  content: { gap: 6 },
  bar: { height: 10, borderRadius: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  percentage: { fontWeight: 'bold' },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
});
