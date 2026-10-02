import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
} from '@/core/storage/tokens';
import { useAuthStore } from '@/features/auth/auth.store';
import type { TokenResponse } from '@/features/auth/auth.types';

const baseURL = process.env.EXPO_PUBLIC_API_URL;
const TIMEOUT_MS = 8000;

export const apiClient = axios.create({ baseURL, timeout: TIMEOUT_MS });

// Cliente sin interceptores, solo para /auth/refresh: así un 401 del refresh
// nunca vuelve a disparar otro refresh.
const refreshClient = axios.create({ baseURL, timeout: TIMEOUT_MS });

// Endpoints donde un 401 significa "credenciales incorrectas", no "token vencido".
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si llegan varios 401 a la vez, todos esperan el mismo refresh en curso.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await refreshClient.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    await saveAccessToken(data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

async function endSession(): Promise<void> {
  await clearTokens();
  useAuthStore.getState().clearSession();
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const isRefreshable =
      error.response?.status === 401 &&
      original !== undefined &&
      !original._retry &&
      !NO_REFRESH_PATHS.some((path) => original.url?.includes(path));

    if (!isRefreshable) {
      return Promise.reject(error);
    }

    original._retry = true; // solo un reintento por petición

    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const newAccessToken = await refreshPromise;

    if (!newAccessToken) {
      await endSession();
      return Promise.reject(error);
    }

    original.headers.Authorization = `Bearer ${newAccessToken}`;
    return apiClient(original);
  },
);
