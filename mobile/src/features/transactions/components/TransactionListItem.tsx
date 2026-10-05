import { StyleSheet } from 'react-native';
import { Avatar, List, Text, useTheme } from 'react-native-paper';

import { formatMoney } from '@/core/utils/currency';
import { formatDateLabel } from '@/core/utils/date';
import { moneyColors } from '@/theme';

import type { Transaction } from '../transactions.types';

type Props = {
  transaction: Transaction;
  /** Muestra la fecha en la línea secundaria (cuando la lista no agrupa por día). */
  showDate?: boolean;
};

/** Fila de un movimiento: icono y nombre de la categoría, detalle y monto con signo. */
export function TransactionListItem({ transaction, showDate = false }: Props) {
  const { colors } = useTheme();
  const isExpense = transaction.type === 'GASTO';
  const color = isExpense ? moneyColors.expense : moneyColors.income;
  const sign = isExpense ? '-' : '+';

  const details = [
    transaction.description,
    transaction.account_name,
    transaction.payment_method_name,
    showDate ? formatDateLabel(transaction.date) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <List.Item
      title={transaction.category_name}
      description={details}
      descriptionNumberOfLines={2}
      titleStyle={styles.title}
      left={(props) => (
        <Avatar.Icon
          {...props}
          size={40}
          icon={transaction.category_icon || 'tag'}
          color={color}
          style={[styles.avatar, { backgroundColor: colors.surfaceVariant }]}
        />
      )}
      right={() => (
        <Text
          variant="titleMedium"
          style={[styles.amount, { color }]}
          accessibilityLabel={`${isExpense ? 'Gasto' : 'Ingreso'} de ${formatMoney(transaction.amount)}`}
        >
          {sign} {formatMoney(transaction.amount)}
        </Text>
      )}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '600' },
  avatar: { alignSelf: 'center' },
  amount: { alignSelf: 'center', fontWeight: 'bold' },
});
