export type PaymentMethodType = 'efectivo' | 'tarjeta' | 'transferencia' | 'qr' | 'billetera_digital';

export type PaymentMethod = {
  id: number;
  name: string;
  type: PaymentMethodType;
  is_default: boolean;
  is_system: boolean;
  created_at: string;
};

/** Icono (Material Design Icons) para cada tipo de método de pago. */
export const PAYMENT_METHOD_ICONS: Record<PaymentMethodType, string> = {
  efectivo: 'cash',
  tarjeta: 'credit-card',
  transferencia: 'bank-transfer',
  qr: 'qrcode',
  billetera_digital: 'cellphone',
};
