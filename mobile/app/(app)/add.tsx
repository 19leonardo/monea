import { Redirect } from 'expo-router';

// Ruta reservada para el botón ➕ de la barra. El tab no navega aquí (abre la hoja
// "Registrar"); si se llega por un enlace directo, se vuelve a Inicio.
export default function AddPlaceholder() {
  return <Redirect href="/" />;
}
