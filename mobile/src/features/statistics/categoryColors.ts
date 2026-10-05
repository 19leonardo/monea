/**
 * Paleta fija para los gráficos: el color depende del id de la categoría, así una
 * categoría tiene siempre el mismo color (en cualquier mes y en cualquier gráfico).
 * 12 colores distintos = uno por cada categoría del sistema.
 */
const PALETTE = [
  '#00796B', // teal
  '#E65100', // naranja
  '#1E88E5', // azul
  '#8E24AA', // violeta
  '#C62828', // rojo
  '#F9A825', // amarillo
  '#2E7D32', // verde
  '#6D4C41', // marrón
  '#D81B60', // rosa
  '#3949AB', // índigo
  '#00ACC1', // cian
  '#7CB342', // verde lima
] as const;

export function categoryColor(categoryId: number): string {
  return PALETTE[Math.abs(categoryId) % PALETTE.length];
}
