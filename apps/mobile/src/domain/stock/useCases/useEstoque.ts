import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { catalogoKeys } from '@domain/catalog/useCases/useCatalogo';
import { useSessaoStore } from '@store/sessaoStore';

import * as service from '../stockService';

export const estoqueKeys = {
  all: ['estoque'] as const,
  movimentacoes: (tenantId: string) => [...estoqueKeys.all, 'movimentacoes', tenantId] as const,
};

export function useMovimentacoes() {
  const tenantId = useSessaoStore((s) => s.tenantId);

  return useQuery({
    queryKey: estoqueKeys.movimentacoes(tenantId ?? 'sem-tenant'),
    queryFn: () => service.listarMovimentacoes(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: 60 * 1000,
  });
}

/**
 * Invalida estoque E catálogo: a movimentação muda o saldo do produto, que é
 * o que pinta o badge na tela Produtos e a barra colorida em Estoque.
 */
export function useRegistrarMovimentacao() {
  const tenantId = useSessaoStore((s) => s.tenantId);
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (dados: { produtoId: string | null; produtoNome: string; delta: number }) =>
      service.registrarMovimentacao(
        tenantId as string,
        dados.produtoId,
        dados.produtoNome,
        dados.delta,
      ),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: estoqueKeys.all });
      void cliente.invalidateQueries({ queryKey: catalogoKeys.all });
    },
  });
}
