import { StyleSheet, View } from 'react-native';
import { Avatar, Card, Chip, Text, useTheme } from 'react-native-paper';

import { formatMoney, toCents } from '@/core/utils/currency';

import { type Account, ACCOUNT_TYPE_INFO } from '../accounts.types';

type Props = {
  account: Account;
};

export function AccountCard({ account }: Props) {
  const { colors } = useTheme();
  const info = ACCOUNT_TYPE_INFO[account.type];
  const negative = toCents(account.balance) < 0;

  return (
    <Card mode="elevated" style={[styles.card, !account.is_active && styles.inactive]}>
      <Card.Title
        title={account.name}
        subtitle={info?.label ?? account.type}
        titleVariant="titleMedium"
        left={(props) => (
          <Avatar.Icon
            {...props}
            icon={info?.icon ?? 'wallet'}
            color={colors.onPrimaryContainer}
            style={{ backgroundColor: colors.primaryContainer }}
          />
        )}
        right={() =>
          account.is_active ? null : (
            <Chip compact style={styles.chip}>
              Inactiva
            </Chip>
          )
        }
      />
      <Card.Content>
        <View style={styles.balanceRow}>
          <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
            Saldo
          </Text>
          <Text
            variant="headlineSmall"
            style={[styles.balance, { color: negative ? colors.error : colors.onSurface }]}
          >
            {formatMoney(account.balance, account.currency)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  inactive: { opacity: 0.6 },
  chip: { marginRight: 12 },
  balanceRow: { alignItems: 'flex-end' },
  balance: { fontWeight: 'bold' },
});
