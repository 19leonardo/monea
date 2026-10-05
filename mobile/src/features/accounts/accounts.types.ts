export const ACCOUNT_TYPES = [
  'efectivo',
  'cuenta_bancaria',
  'tarjeta_debito',
  'tarjeta_credito',
  'billetera_digital',
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Etiqueta en español e icono (Material Design Icons) de cada tipo. */
export const ACCOUNT_TYPE_INFO: Record<AccountType, { label: string; icon: string }> = {
  efectivo: { label: 'Efectivo', icon: 'cash' },
  cuenta_bancaria: { label: 'Cuenta bancaria', icon: 'bank' },
  tarjeta_debito: { label: 'Tarjeta de débito', icon: 'credit-card-outline' },
  tarjeta_credito: { label: 'Tarjeta de crédito', icon: 'credit-card' },
  billetera_digital: { label: 'Billetera digital', icon: 'wallet' },
};

/** Los montos llegan como texto decimal ("1500.50") para no perder precisión. */
export type Account = {
  id: number;
  name: string;
  type: AccountType;
  initial_balance: string;
  balance: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AccountCreate = {
  name: string;
  type: AccountType;
  initial_balance: string;
  currency?: string;
};

export type AccountUpdate = Partial<AccountCreate> & {
  is_active?: boolean;
};
