/**
 * Fechas "de calendario" (sin hora) para la API: "YYYY-MM-DD" en la zona local.
 * No se usa toISOString(): convierte a UTC y, en Bolivia (UTC-4), después de las
 * 20:00 devolvería el día siguiente.
 */

const MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "2026-10-05" -> Date a las 00:00 locales. */
export function fromISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** "Hoy", "Ayer" o "5 oct 2026". */
export function formatDateLabel(value: string): string {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (value === toISODate(today)) return 'Hoy';
  if (value === toISODate(yesterday)) return 'Ayer';

  const date = fromISODate(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
