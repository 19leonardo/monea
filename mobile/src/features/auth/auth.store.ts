import { create } from 'zustand';

import type { User } from './auth.types';

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  // true mientras se decide al arrancar si hay una sesión guardada.
  isLoading: boolean;
  setSession: (user: User) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setSession: (user) => set({ user, isAuthenticated: true, isLoading: false }),
  clearSession: () => set({ user: null, isAuthenticated: false, isLoading: false }),
}));
