export type CategoryType = 'gasto' | 'ingreso';

export type Category = {
  id: number;
  name: string;
  /** Nombre de un icono de Material Design Icons. */
  icon: string;
  type: CategoryType;
  is_default: boolean;
  is_system: boolean;
  created_at: string;
};
