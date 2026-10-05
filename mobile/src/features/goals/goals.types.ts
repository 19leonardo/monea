export type GoalStatus = 'activa' | 'completada' | 'cancelada';

/** Respuesta de /goals. Montos como texto decimal ("8000.00"); los calculados vienen del backend. */
export type Goal = {
  id: number;
  name: string;
  description: string | null;
  target_amount: string;
  current_amount: string;
  /** "YYYY-MM-DD" */
  target_date: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
  /** "43.75" (porcentaje con 2 decimales; puede pasar de 100). */
  progress: string;
  remaining: string;
  /** null si no hay fecha objetivo, ya venció o la meta no está activa. */
  recommended_monthly: string | null;
};

export type GoalCreate = {
  name: string;
  target_amount: string;
  target_date?: string | null;
  description?: string | null;
};

export type GoalUpdate = Partial<GoalCreate> & { status?: GoalStatus };

export type ContributionCreate = {
  amount: string;
  /** "YYYY-MM-DD"; si se omite, hoy. */
  date?: string;
};
