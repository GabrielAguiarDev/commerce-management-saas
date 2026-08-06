import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { catalogoKeys } from '@domain/catalog/useCases/useCatalogo';
import { useConexaoStore } from '@store/conexaoStore';
import { useSessaoStore } from '@store/sessaoStore';

import * as service from '../salesService';
import type { ItemCarrinho } from '../salesTypes';

export const vendasKeys = {
  all: ['vendas'] as const,
  doDia: (tenantId: string) => [...vendasKeys.all, 'do-dia', tenantId] as const,
  resumo: (tenantId: string) => [...vendasKeys.all, 'resumo', tenantId] as const,
};

export function useUltimasVendas() {
  const tenantId = useSessaoStore((s) => s.tenantId);

  return useQuery({
    queryKey: vendasKeys.doDia(tenantId ?? 'sem-tenant'),
    queryFn: () => service.listarVendasDoDia(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: 30 * 1000,
  });
}

export function useResumoDoDia() {
  const tenantId = useSessaoStore((s) => s.tenantId);

  return useQuery({
    queryKey: vendasKeys.resumo(tenantId ?? 'sem-tenant'),
    queryFn: () => service.obterResumoDoDia(tenantId as string),
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
export function useFinalizarVenda() {
  const tenantId = useSessaoStore((s) => s.tenantId);
  const online = useConexaoStore((s) => s.online);
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (dados: { itens: readonly ItemCarrinho[]; formaPagamento: string }) =>
      service.finalizarVenda(tenantId as string, dados.itens, dados.formaPagamento, online),

    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: vendasKeys.all });
      void cliente.invalidateQueries({ queryKey: catalogoKeys.all });
    },
  });
}
