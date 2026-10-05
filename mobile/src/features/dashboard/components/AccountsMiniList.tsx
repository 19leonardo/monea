import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { ActivityIndicator, Button, Card, List, Text, useTheme } from 'react-native-paper';

import { getApiErrorMessage } from '@/core/api/errors';
import { formatMoney, toCents } from '@/core/utils/currency';
import { type Account, ACCOUNT_TYPE_INFO } from '@/features/accounts/accounts.types';

type Props = {
  accounts: Account[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
};

/** Sección "Tus cuentas": nombre y saldo de cada cuenta, con acceso a Cuentas. */
export function AccountsMiniList({ accounts, isPending, error, onRetry }: Props) {
  const { colors } = useTheme();

  let body;
  if (isPending) {
    body = <ActivityIndicator style={styles.loader} />;
  } else if (error || !accounts) {
    body = (
      <>
        <Text style={[styles.padded, { color: colors.error }]}>{getApiErrorMessage(error)}</Text>
        <Button compact onPress={onRetry} style={styles.retry}>
          Reintentar
        </Button>
      </>
    );
  } else if (accounts.length === 0) {
    body = (
      <Text style={[styles.padded, { color: colors.onSurfaceVariant }]}>
        Aún no tienes cuentas. Crea la primera para empezar.
      </Text>
    );
  } else {
    body = accounts.map((account) => (
      <List.Item
        key={account.id}
        title={account.name}
        description={account.is_active ? undefined : 'Inactiva'}
        style={!account.is_active && styles.inactive}
        left={(props) => (
          <List.Icon {...props} icon={ACCOUNT_TYPE_INFO[account.type]?.icon ?? 'wallet'} />
        )}
        right={() => (
          <Text
            variant="titleSmall"
            style={[
              styles.balance,
              { color: toCents(account.balance) < 0 ? colors.error : colors.onSurface },
            ]}
          >
            {formatMoney(account.balance, account.currency)}
          </Text>
        )}
      />
    ));
  }

  const empty = !isPending && !error && accounts?.length === 0;

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Title title="Tus cuentas" titleVariant="titleMedium" />
      {body}
      <Card.Actions>
        {empty ? (
          <Button mode="contained" icon="plus" onPress={() => router.push('/accounts/new')}>
            Crear cuenta
          </Button>
        ) : (
          <Button mode="contained-tonal" icon="wallet" onPress={() => router.push('/accounts')}>
            Ver cuentas
          </Button>
        )}
      </Card.Actions>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  loader: { marginVertical: 16 },
  padded: { paddingHorizontal: 16 },
  retry: { alignSelf: 'flex-start', marginLeft: 8 },
  inactive: { opacity: 0.6 },
  balance: { alignSelf: 'center', fontWeight: 'bold' },
});
