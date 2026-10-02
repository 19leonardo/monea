import { apiClient } from '@/core/api/client';
import { clearTokens, saveTokens } from '@/core/storage/tokens';

import { useAuthStore } from './auth.store';
import type { RegisterData, TokenResponse, User } from './auth.types';

export async function register(data: RegisterData): Promise<User> {
  const { data: user } = await apiClient.post<User>('/auth/register', data);
  return user;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/users/me');
  return data;
}

/**
 * Inicia sesión: guarda ambos tokens en secure-store, carga el perfil y abre la
 * sesión en el store. El layout raíz reacciona y muestra el grupo (app).
 */
export async function login(email: string, password: string): Promise<User> {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', { email, password });
  await saveTokens(data.access_token, data.refresh_token);
  const user = await getMe();
  useAuthStore.getState().setSession(user);
  return user;
}

export async function logout(): Promise<void> {
  await clearTokens();
  useAuthStore.getState().clearSession();
}
