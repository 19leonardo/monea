import { create } from 'zustand';

type FeedbackState = {
  message: string | null;
  showMessage: (message: string) => void;
  clearMessage: () => void;
};

/**
 * Mensaje breve para el usuario que sobrevive a una navegación: p. ej. el
 * formulario guarda, se cierra, y el Snackbar aparece en la pantalla anterior.
 */
export const useFeedback = create<FeedbackState>((set) => ({
  message: null,
  showMessage: (message) => set({ message }),
  clearMessage: () => set({ message: null }),
}));
