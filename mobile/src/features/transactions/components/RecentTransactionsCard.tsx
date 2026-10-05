import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { ActivityIndicator, Button, Card, Text, useTheme } from 'react-native-paper';

import { getApiErrorMessage } from '@/core/api/errors';

import { useTransactions } from '../useTransactions';
import { TransactionListItem } from './TransactionListItem';

const RECENT_LIMIT = 5;

/** Tarjeta de Inicio: los últimos movimientos y acceso al historial completo. */
export function RecentTransactionsCard() {
  const { colors } = useTheme();
  const { data, isPending, isError, error, refetch } = useTransactions({}, RECENT_LIMIT);

  let body;
  if (isPending) {
    body = <ActivityIndicator style={styles.loader} />;
  } else if (isError) {
    body = (
      <>
        <Text variant="bodyMedium" style={[styles.padded, { color: colors.error }]}>
          {getApiErrorMessage(error)}
        </Text>
        <Button compact onPress={() => refetch()} style={styles.retry}>
          Reintentar
        </Button>
      </>
    );
  } else if (data.length === 0) {
    body = (
      <Text variant="bodyMedium" style={[styles.padded, { color: colors.onSurfaceVariant }]}>
        Aún no hay movimientos. Usa el botón ➕ para registrar el primero.
      </Text>
    );
  } else {
    body = data.map((transaction) => (
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
