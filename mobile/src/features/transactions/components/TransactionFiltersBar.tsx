import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, SegmentedButtons, useTheme } from 'react-native-paper';

import { OptionSheet, type SelectOption } from '@/components/OptionSheet';
import { formatRangeLabel } from '@/core/utils/date';
import { ACCOUNT_TYPE_INFO } from '@/features/accounts/accounts.types';
import { useAccounts } from '@/features/accounts/useAccounts';
import { useCategories } from '@/features/categories/useCategories';

import type { TransactionFilters, TransactionType } from '../transactions.types';
import { DateRangeSheet } from './DateRangeSheet';

type Props = {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
};

type TypeValue = 'todos' | TransactionType;
type OpenSheet = 'account' | 'category' | 'dates' | null;

/** Filtros del historial. Solo cambian el estado: el filtrado lo hace el backend. */
export function TransactionFiltersBar({ filters, onChange }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState<OpenSheet>(null);

  const accounts = useAccounts();
  // Con un tipo elegido, solo se ofrecen las categorías de ese tipo.
  const categoryType =
    filters.type === 'GASTO' ? 'gasto' : filters.type === 'INGRESO' ? 'ingreso' : undefined;
  const categories = useCategories(categoryType);

  const accountOptions: SelectOption<number>[] = (accounts.data ?? []).map((account) => ({
    value: account.id,
    label: account.name,
    icon: ACCOUNT_TYPE_INFO[account.type]?.icon ?? 'wallet',
  }));
  const categoryOptions: SelectOption<number>[] = (categories.data ?? []).map((category) => ({
    value: category.id,
    label: category.name,
    description: categoryType ? undefined : category.type === 'gasto' ? 'Gasto' : 'Ingreso',
    icon: category.icon,
  }));

  const accountName = accounts.data?.find((a) => a.id === filters.account_id)?.name;
  const categoryName = categories.data?.find((c) => c.id === filters.category_id)?.name;
  const dateRange =
    filters.start_date && filters.end_date
      ? { start: filters.start_date, end: filters.end_date }
      : null;

  const hasFilters = Object.values(filters).some((value) => value !== undefined);

  const setType = (value: string) => {
    const type = value === 'todos' ? undefined : (value as TransactionType);
    // La categoría elegida puede no ser del nuevo tipo: se quita.
    onChange({ ...filters, type, category_id: type === filters.type ? filters.category_id : undefined });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SegmentedButtons
        value={(filters.type ?? 'todos') as TypeValue}
        onValueChange={setType}
        density="medium"
        buttons={[
          { value: 'todos', label: 'Todos' },
          { value: 'INGRESO', label: 'Ingresos', icon: 'arrow-up' },
          { value: 'GASTO', label: 'Gastos', icon: 'arrow-down' },
        ]}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <Chip
          icon="wallet"
          selected={!!filters.account_id}
          showSelectedOverlay
          onPress={() => setOpen('account')}
          onClose={filters.account_id ? () => onChange({ ...filters, account_id: undefined }) : undefined}
          disabled={accounts.isPending || accounts.isError}
        >
          {accountName ?? 'Cuenta'}
        </Chip>
        <Chip
          icon="shape"
          selected={!!filters.category_id}
          showSelectedOverlay
          onPress={() => setOpen('category')}
          onClose={
            filters.category_id ? () => onChange({ ...filters, category_id: undefined }) : undefined
          }
          disabled={categories.isPending || categories.isError}
        >
          {categoryName ?? 'Categoría'}
        </Chip>
        <Chip
          icon="calendar"
          selected={!!dateRange}
          showSelectedOverlay
          onPress={() => setOpen('dates')}
          onClose={
            dateRange
              ? () => onChange({ ...filters, start_date: undefined, end_date: undefined })
              : undefined
          }
        >
          {dateRange ? formatRangeLabel(dateRange) : 'Fechas'}
        </Chip>
        {hasFilters && (
          <Button compact icon="filter-remove" onPress={() => onChange({})}>
            Limpiar
          </Button>
        )}
      </ScrollView>

      <OptionSheet
        visible={open === 'account'}
        title="Filtrar por cuenta"
        options={accountOptions}
        value={filters.account_id}
        onSelect={(id) => onChange({ ...filters, account_id: id ?? undefined })}
        onDismiss={() => setOpen(null)}
        emptyOptionLabel="Todas las cuentas"
      />
      <OptionSheet
        visible={open === 'category'}
        title="Filtrar por categoría"
        options={categoryOptions}
        value={filters.category_id}
        onSelect={(id) => onChange({ ...filters, category_id: id ?? undefined })}
        onDismiss={() => setOpen(null)}
        emptyOptionLabel="Todas las categorías"
      />
      <DateRangeSheet
        visible={open === 'dates'}
        value={dateRange}
        onApply={(range) =>
          onChange({ ...filters, start_date: range?.start, end_date: range?.end })
        }
        onDismiss={() => setOpen(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 12 },
  chips: { gap: 8, alignItems: 'center', paddingBottom: 4 },
});
