import { useQueryClient } from '@tanstack/react-query';
import { createElement, useCallback, useState, type ReactElement } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';

import { useAppTheme } from './useAppTheme';

/** O indicador fica ao menos isto na tela: um giro de 80ms parece falha. */
const MIN_SPINNER_MS = 500;

/**
 * O "puxar para atualizar" — igual em todas as telas.
 *
 * Refaz as consultas ATIVAS do react-query, isto é, as que alguma tela montada
 * está lendo, e só solta o indicador quando elas voltam. É por isso que não
 * existe um `refetch` por tela: o dado da tela aberta é, por definição, uma
 * consulta ativa, e qualquer tela nova já nasce com o gesto funcionando.
 *
 * Entram junto o plano e o acesso ao app (lidos pelo guardião, sempre
 * montado): puxar para baixo também traz um módulo ligado ou desligado no
 * painel sem esperar o `staleTime`.
 *
 * Erro de rede não trava o gesto: `refetchQueries` não lança, e cada tela
 * continua mostrando o próprio estado de erro como já mostrava.
 */
export function usePullToRefresh(): { refreshing: boolean; onRefresh: () => void } {
  const client = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const started = Date.now();
    void client.refetchQueries({ type: 'active' }).finally(() => {
      const wait = Math.max(0, MIN_SPINNER_MS - (Date.now() - started));
      setTimeout(() => setRefreshing(false), wait);
    });
  }, [client]);

  return { refreshing, onRefresh };
}

/**
 * O `RefreshControl` do app, já ligado ao gesto e na cor da marca, pronto
 * para o `refreshControl` de um `ScrollView`.
 *
 * É um hook que devolve o ELEMENTO, e não um componente `<PullToRefresh />`,
 * de propósito: no Android o `ScrollView` clona o `refreshControl` e se põe
 * como FILHO dele. Um componente que embrulhasse o `RefreshControl` receberia
 * esses filhos e os descartaria — a tela sumiria.
 */
export function useRefreshControl(): ReactElement<RefreshControlProps> {
  const theme = useAppTheme();
  const { refreshing, onRefresh } = usePullToRefresh();

  return createElement(RefreshControl, {
    refreshing,
    onRefresh,
    tintColor: theme.colors.primary,
    colors: [theme.colors.primary],
    progressBackgroundColor: theme.colors.surface,
  });
}
