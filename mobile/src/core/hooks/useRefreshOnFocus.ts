import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Vuelve a pedir los datos cada vez que la pantalla recupera el foco (p. ej. al
 * volver desde otra pantalla). Se salta el primer foco: al montarse, useQuery ya
 * hace la petición inicial.
 *
 * `refetch` se guarda en un ref: así el efecto depende solo del foco y no se
 * re-ejecuta (ni recarga en bucle) cuando cambia la identidad de la función.
 */
export function useRefreshOnFocus(refetch: () => unknown) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const firstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refetchRef.current();
    }, []),
  );
}
