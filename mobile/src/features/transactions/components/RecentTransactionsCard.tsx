import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { ActivityIndicator, Button, Card, Text, useTheme } from 'react-native-paper';

import { getApiErrorMessage } from '@/core/api/errors';

import type { Transaction } from '../transactions.types';
import { TransactionListItem } from './TransactionListItem';

type Props = {
  transactions: Transaction[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
};

/** Sección "Últimos movimientos" de Inicio, con acceso al historial completo. */
export function RecentTransactionsCard({ transactions, isPending, error, onRetry }: Props) {
  const { colors } = useTheme();

  let body;
  if (isPending) {
    body = <ActivityIndicator style={styles.loader} />;
  } else if (error || !transactions) {
    body = (
      <>
        <Text variant="bodyMedium" style={[styles.padded, { color: colors.error }]}>
          {getApiErrorMessage(error)}
        </Text>
        <Button compact onPress={onRetry} style={styles.retry}>
          Reintentar
        </Button>
      </>
    );
  } else if (transactions.length === 0) {
    body = (
      <Text variant="bodyMedium" style={[styles.padded, { color: colors.onSurfaceVariant }]}>
        Registra tu primer movimiento con el botón ➕.
      </Text>
    );
  } else {
    body = transactions.map((transaction) => (
      <TransactionListItem key={transaction.id} transaction={transaction} showDate />
    ));
  }

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title title="Últimos movimientos" titleVariant="titleMedium" />
      {body}
      <Card.Actions>
        <Button mode="contained-tonal" icon="history" onPress={() => router.push('/transactions')}>
          Ver historial
        </Button>
      </Card.Actions>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  loader: { marginVertical: 16 },
  padded: { paddingHorizontal: 16 },
  retry: { alignSelf: 'flex-start', marginLeft: 8 },
});
