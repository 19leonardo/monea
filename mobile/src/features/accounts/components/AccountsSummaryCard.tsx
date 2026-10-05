import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { ActivityIndicator, Button, Card, Text, useTheme } from 'react-native-paper';

import { getApiErrorMessage } from '@/core/api/errors';
import { centsToDecimal, formatMoney, toCents } from '@/core/utils/currency';

import type { Account } from '../accounts.types';
import { useAccounts } from '../useAccounts';

/** Suma los saldos de las cuentas activas, en centavos y por moneda. */
function totalsByCurrency(accounts: Account[]): [string, number][] {
  const totals = new Map<string, number>();
  for (const account of accounts) {
    if (!account.is_active) continue;
    totals.set(account.currency, (totals.get(account.currency) ?? 0) + toCents(account.balance));
  }
  return [...totals.entries()];
}

/** Tarjeta de Inicio: saldo total y acceso a la pantalla de Cuentas. */
export function AccountsSummaryCard() {
  const { colors } = useTheme();
  const { data: accounts, isPending, isError, error, refetch } = useAccounts();

  let body;
  if (isPending) {
    body = <ActivityIndicator style={styles.loader} />;
  } else if (isError) {
    body = (
      <>
        <Text variant="bodyMedium" style={{ color: colors.error }}>
          {getApiErrorMessage(error)}
        </Text>
        <Button compact onPress={() => refetch()} style={styles.retry}>
          Reintentar
        </Button>
      </>
    );
  } else if (accounts.length === 0) {
    body = (
      <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
        Aún no tienes cuentas, crea la primera
      </Text>
    );
  } else {
    const totals = totalsByCurrency(accounts);
    body = (
      <>
        <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
          Saldo total
        </Text>
        {totals.length === 0 ? (
          <Text variant="bodyMedium">Todas tus cuentas están inactivas</Text>
        ) : (
          totals.map(([currency, cents]) => (
            <Text
              key={currency}
              variant="headlineMedium"
              style={[styles.total, { color: cents < 0 ? colors.error : colors.onSurface }]}
            >
              {formatMoney(centsToDecimal(cents), currency)}
            </Text>
          ))
        )}
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
          {accounts.length === 1 ? '1 cuenta' : `${accounts.length} cuentas`}
        </Text>
      </>
    );
  }

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title title="Mis cuentas" titleVariant="titleMedium" />
      <Card.Content style={styles.content}>{body}</Card.Content>
      <Card.Actions>
        <Button mode="contained-tonal" icon="wallet" onPress={() => router.push('/accounts')}>
          Ver cuentas
        </Button>
      </Card.Actions>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  content: { gap: 4 },
  loader: { alignSelf: 'flex-start', marginVertical: 8 },
  retry: { alignSelf: 'flex-start' },
  total: { fontWeight: 'bold' },
});
