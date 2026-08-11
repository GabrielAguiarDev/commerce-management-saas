import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { catalogoKeys } from '@domain/catalog/useCases/useCatalog';
import { useConnectionStore } from '@store/connectionStore';
import { useSessionStore } from '@store/sessionStore';

import * as service from '../salesService';
import type { PendingSale, SyncSummary } from '../salesTypes';

import { pendingSalesKeys, salesKeys } from './queryKeys';

export { pendingSalesKeys };

/**
 * A FILA DO APARELHO.
 *
 * `staleTime: Infinity` e nenhum refetch automático: esta lista não vem da
 * rede, vem de uma tabela local que só MUDA por ação nossa (fechar uma venda
 * offline, sincronizar, descartar). Quem a altera invalida a chave. Refazer a
 * consulta a cada foco de janela seria trabalho para descobrir o que já
 * sabemos.
 */
export function usePendingSales() {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: pendingSalesKeys.queue(tenantId ?? 'sem-tenant'),
    queryFn: () => service.listPendingSales(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: Infinity,
  });
}

/**
 * Quantas vendas esperam para subir.
 *
 * Sai da MESMA consulta da lista, via `select`, em vez de um `COUNT` próprio:
 * duas leituras poderiam discordar por um instante, e é o tipo de divergência
 * que aparece como "3 vendas aguardando" em cima de uma lista com 2.
 */
export function usePendingSalesCount(): number {
  const tenantId = useSessionStore((s) => s.tenantId);

  const { data = 0 } = useQuery({
    queryKey: pendingSalesKeys.queue(tenantId ?? 'sem-tenant'),
    queryFn: () => service.listPendingSales(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: Infinity,
    select: (sales: PendingSale[]) => sales.length,
  });

  return data;
}

/**
 * LANÇAR AS VENDAS NO SISTEMA.
 *
 * Manual por decisão de produto: quem aperta é o vendedor, depois de olhar a
 * lista. Sincronizar sozinho ao voltar a conexão colocaria vendas no sistema
 * sem ninguém sabendo — e, quando uma fosse recusada por estoque, o erro
 * apareceria desacompanhado, longe do momento em que dava para lembrar do que
 * aconteceu no balcão.
 *
 * Liga o `syncing` do `connectionStore` (o banner teal) no começo e o desliga
 * no fim, DÊ NO QUE DER: se o `finally` não devolvesse a flag, um erro deixaria
 * o app anunciando uma sincronização eterna.
 */
export function useSyncPendingSales() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const startSync = useConnectionStore((s) => s.startSync);
  const finishSync = useConnectionStore((s) => s.finishSync);
  const client = useQueryClient();

  return useMutation<SyncSummary, Error, void>({
    mutationFn: async () => {
      startSync();
      try {
        return await service.syncPendingSales(tenantId as string);
      } finally {
        finishSync();
      }
    },

    onSettled: () => {
      // `onSettled` e não `onSuccess`: mesmo uma sincronização que terminou com
      // erros pode ter subido parte da fila, e essas vendas já mudaram o
      // faturamento do dia e o estoque.
      void client.invalidateQueries({ queryKey: pendingSalesKeys.all });
      void client.invalidateQueries({ queryKey: salesKeys.all });
      void client.invalidateQueries({ queryKey: catalogoKeys.all });
    },
  });
}

/** Descartar uma venda que a fila não conseguiu enviar. */
export function useDiscardPendingSale() {
  const client = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (localId: string) => service.discardPendingSale(localId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: pendingSalesKeys.all });
    },
  });
}
