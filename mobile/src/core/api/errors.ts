import { isAxiosError } from 'axios';

type StatusMessages = Partial<Record<number, string>>;

/**
 * Convierte un error de la API en un mensaje legible en español.
 * `byStatus` permite dar un texto específico por código HTTP (p. ej. 401, 409).
 */
export function getApiErrorMessage(error: unknown, byStatus: StatusMessages = {}): string {
  if (!isAxiosError(error)) {
    return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  }
  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? 'El servidor tardó demasiado en responder. Inténtalo de nuevo.'
      : 'No se pudo conectar con el servidor. Revisa tu conexión.';
  }

  const { status, data } = error.response;
  if (byStatus[status]) {
    return byStatus[status];
  }

  // FastAPI: `detail` es un texto, o una lista de errores de validación (422).
  const detail = (data as { detail?: unknown } | undefined)?.detail;
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') {
    return detail[0].msg;
  }
  if (status >= 500) {
    return 'Error del servidor. Inténtalo más tarde.';
  }
  return 'No se pudo completar la solicitud.';
}

export function getApiErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}
