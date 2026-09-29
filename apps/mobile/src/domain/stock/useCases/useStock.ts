import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { catalogoKeys } from '@domain/catalog/useCases/useCatalog';
import { costsKeys } from '@domain/costs/useCases/useCosts';
import { useSessionStore } from '@store/sessionStore';

import * as service from '../stockService';

export const stockKeys = {
  all: ['stock'] as const,
  stockMovements: (tenantId: string) => [...stockKeys.all, 'movimentacoes', tenantId] as const,
};

/**
 * O histórico de movimentações, uma página de cada vez — mais ao rolar. Mora
 * na própria tela (`/stock-history`): no fim da lista infinita de Estoque
 * ninguém chegaria nele.
 */
export function useStockMovements() {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useInfiniteQuery({
    queryKey: stockKeys.stockMovements(tenantId ?? 'sem-tenant'),
    queryFn: ({ pageParam }) => service.listStockMovementsPage(tenantId as string, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
    enabled: Boolean(tenantId),
    staleTime: 60 * 1000,
  });
}

/**
 * Invalida estoque E catálogo: a movimentação muda o saldo do produto, que é
 * o que pinta o badge na tela Produtos e a barra colorida em Estoque.
 */
export function useRecordStockMovement() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const client = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      productId: string | null;
      productName: string;
      delta: number;
      unitCostCents?: number | null;
    }) =>
      service.recordStockMovement(
        tenantId as string,
        data.productId,
        data.productName,
        data.delta,
        data.unitCostCents ?? null,
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: stockKeys.all });
      void client.invalidateQueries({ queryKey: catalogoKeys.all });
      // A entrada com custo lança uma despesa e muda `products.cost`: sem
      // invalidar os custos, a aba Custos continuaria sem a compra que o dono
      // acabou de registrar, e ele a lançaria de novo à mão.
      void client.invalidateQueries({ queryKey: costsKeys.all });
    },
  });
}
