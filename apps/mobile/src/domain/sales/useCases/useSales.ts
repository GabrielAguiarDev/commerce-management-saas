import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { catalogoKeys } from '@domain/catalog/useCases/useCatalog';
import { useConnectionStore } from '@store/connectionStore';
import { useSessionStore } from '@store/sessionStore';

import * as service from '../salesService';
import type { CartItem } from '../salesTypes';

export const salesKeys = {
  all: ['vendas'] as const,
  doDia: (tenantId: string) => [...salesKeys.all, 'do-dia', tenantId] as const,
  summary: (tenantId: string) => [...salesKeys.all, 'resumo', tenantId] as const,
};

export function useRecentSales() {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: salesKeys.doDia(tenantId ?? 'sem-tenant'),
    queryFn: () => service.listDailySales(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: 30 * 1000,
  });
}

export function useDailySummary() {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: salesKeys.summary(tenantId ?? 'sem-tenant'),
    queryFn: () => service.getDailySummary(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: 30 * 1000,
  });
}

/**
 * Finalizar venda.
 *
 * O estado da conexão é LIDO AQUI e passado ao service: quem conhece store é
 * o useCase, nunca o service — é o que mantém `finalizarVenda` testável no
 * jest node, sem mock de zustand.
 *
 * Invalida também o catálogo porque a venda baixa estoque: sem isso, o badge
 * "3 em estoque" continuaria mentindo até o próximo refetch.
 */
export function useCheckoutSale() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const online = useConnectionStore((s) => s.online);
  const client = useQueryClient();

  return useMutation({
    mutationFn: (data: { items: readonly CartItem[]; paymentMethod: string }) =>
      service.checkoutSale(tenantId as string, data.items, data.paymentMethod, online),

    onSuccess: () => {
      void client.invalidateQueries({ queryKey: salesKeys.all });
      void client.invalidateQueries({ queryKey: catalogoKeys.all });
    },
  });
}
