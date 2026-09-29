import { useEffect, useState } from 'react';

/**
 * O valor, só depois de parar de mudar por `delayMs`.
 *
 * Para a busca que vai ao banco: sem isto, "ração" digitado viraria cinco
 * consultas, e as respostas podem chegar fora de ordem.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
