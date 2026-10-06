/**
 * Dinero sin float: el backend envía los montos como texto decimal ("1500.50") y
 * aquí se trabajan como centavos enteros para no arrastrar errores de redondeo
 * (0.1 + 0.2 !== 0.3). Los 12 dígitos de NUMERIC(12,2) caben en un entero seguro.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  BOB: 'Bs',
  USD: '$',
};

/** "1500.5" | "-20" | 15 -> centavos enteros (150050, -2000, 1500). */
export function toCents(amount: string | number): number {
  const text = typeof amount === 'number' ? amount.toFixed(2) : amount.trim();
  const match = /^(-?)(\d*)(?:\.(\d{0,2})\d*)?$/.exec(text);
  if (!match) {
    throw new Error(`Monto inválido: ${amount}`);
  }
  const [, sign, integer, decimals = ''] = match;
  const cents = Number(integer || '0') * 100 + Number(decimals.padEnd(2, '0'));
  return sign && cents !== 0 ? -cents : cents;
}

/** Centavos -> texto decimal para el backend: 150050 -> "1500.50". */
export function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/**
 * Formato boliviano: punto para miles, coma para decimales.
 * formatMoney("1234.56") -> "Bs 1.234,56"; formatMoney("-50") -> "Bs -50,00".
 */
export function formatMoney(amount: string | number, currency = 'BOB'): string {
  const cents = toCents(amount);
  const abs = Math.abs(cents);
  const integer = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimals = String(abs % 100).padStart(2, '0');
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${symbol} ${cents < 0 ? '-' : ''}${integer},${decimals}`;
}

/**
 * Lee lo que escribe el usuario ("1.234,5", "1234.50", "-20") y lo devuelve como
 * texto decimal para la API ("1234.50"), o null si no es un monto válido.
 * Acepta coma o punto como separador decimal (máx. 2 decimales).
 */
export function parseMoneyInput(input: string): string | null {
  let text = input.trim().replace(/\s/g, '');
  if (text === '') return null;

  // Si trae coma, la coma es el decimal y los puntos son separadores de miles.
  if (text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.');
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) return null;
  return centsToDecimal(toCents(text));
}

/**
 * Porcentaje que llega del backend como texto ("43.75", "12.5") en formato
 * boliviano, sin ceros sobrantes: "43,75 %", "12,5 %", "100 %".
 */
export function formatPercent(value: string | number): string {
  const cents = toCents(value);
  const integer = Math.trunc(Math.abs(cents) / 100);
  const decimals = String(Math.abs(cents) % 100).padStart(2, '0').replace(/0+$/, '');
  const sign = cents < 0 ? '-' : '';
  return decimals === '' ? `${sign}${integer} %` : `${sign}${integer},${decimals} %`;
}
