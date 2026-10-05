import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Divider, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getApiErrorMessage } from '@/core/api/errors';
import { formatDayHeader } from '@/core/utils/date';
import { TransactionFiltersBar } from '@/features/transactions/components/TransactionFiltersBar';
import { TransactionListItem } from '@/features/transactions/components/TransactionListItem';
import type { Transaction, TransactionFilters } from '@/features/transactions/transactions.types';
import { useInfiniteTransactions } from '@/features/transactions/useTransactions';

type DaySection = { date: string; data: Transaction[] };

/** Agrupa por fecha; el backend ya los devuelve ordenados por fecha descendente. */
function groupByDate(transactions: Transaction[]): DaySection[] {
  const sections: DaySection[] = [];
  for (const transaction of transactions) {
    const last = sections[sections.length - 1];
    if (last?.date === transaction.date) {
      last.data.push(transaction);
    } else {
      sections.push({ date: transaction.date, data: [transaction] });
    }
  }
  return sections;
}

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [filters, setFilters] = useState<TransactionFilters>({});

  // Cada cambio de filtros cambia la queryKey y vuelve a pedir al backend.
  const query = useInfiniteTransactions(filters);
  const { data, isPending, isError, error, refetch, isRefetching } = query;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  const sections = useMemo(() => groupByDate(data?.pages.flat() ?? []), [data]);

  let body;
  if (isPending) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  } else if (isError) {
    body = (
      <View style={styles.center}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
        <Text variant="titleMedium">No se pudieron cargar los movimientos</Text>
        <Text style={[styles.muted, { color: colors.onSurfaceVariant }]}>
          {getApiErrorMessage(error)}
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Reintentar
        </Button>
      </View>
    );
  } else {
    body = (
      <SectionList
        sections={sections}
        keyExtractor={(transaction) => String(transaction.id)}
        renderItem={({ item }) => <TransactionListItem transaction={item} />}
        renderSectionHeader={({ section }) => (
          <Text
            variant="labelLarge"
            style={[
              styles.sectionHeader,
              { color: colors.onSurfaceVariant, backgroundColor: colors.background },
            ]}
          >
            {formatDayHeader(section.date)}
          </Text>
        )}
        ItemSeparatorComponent={() => <Divider style={styles.separator} />}
        stickySectionHeadersEnabled
        contentContainerStyle={[
          sections.length === 0 && styles.emptyList,
          { paddingBottom: 24 + insets.bottom },
        ]}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <MaterialCommunityIcons name="receipt-text-outline" size={64} color={colors.primary} />
            <Text variant="titleMedium" style={styles.muted}>
              No hay movimientos con estos filtros
            </Text>
            {Object.values(filters).some((v) => v !== undefined) && (
              <Button mode="outlined" icon="filter-remove" onPress={() => setFilters({})}>
                Limpiar filtros
              </Button>
            )}
          </View>
        }
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TransactionFiltersBar filters={filters} onChange={setFilters} />
      <Divider />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { textAlign: 'center' },
  emptyList: { flexGrow: 1 },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, textTransform: 'capitalize' },
  separator: { marginLeft: 72 },
  footer: { marginVertical: 16 },
});
