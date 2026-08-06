import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessaoStore } from '@store/sessaoStore';

import * as service from '../catalogService';
import type { NovoProduto } from '../catalogTypes';

export const catalogoKeys = {
  all: ['catalogo'] as const,
  lista: (tenantId: string) => [...catalogoKeys.all, 'lista', tenantId] as const,
};

export function useCatalogo() {
  const tenantId = useSessaoStore((s) => s.tenantId);

  return useQuery({
    queryKey: catalogoKeys.lista(tenantId ?? 'sem-tenant'),
    queryFn: () => service.listarProdutos(tenantId as string),
    enabled: Boolean(tenantId),
    // Catálogo muda quando alguém cadastra ou vende; 1 min evita refetch a
    // cada foco de tela sem deixar o balconista ver preço velho.
    staleTime: 60 * 1000,
  });
}

export function useCadastrarProduto() {
  const tenantId = useSessaoStore((s) => s.tenantId);
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (novo: NovoProduto) => service.cadastrarProduto(tenantId as string, novo),
    onSuccess: () => cliente.invalidateQueries({ queryKey: catalogoKeys.all }),
  });
}

/**
 * Favoritar é o toque mais frequente da tela Produtos: precisa responder na
 * hora. Por isso a atualização é OTIMISTA — a estrela vira antes da resposta,
 * e volta atrás se o servidor recusar. Sem isso, cada toque teria a latência
 * da rede e a lista pareceria travada.
 */
export function useAlternarFavorito() {
  const tenantId = useSessaoStore((s) => s.tenantId);
  const cliente = useQueryClient();
  const chave = catalogoKeys.lista(tenantId ?? 'sem-tenant');

  return useMutation({
    mutationFn: (produtoId: string) => service.alternarFavorito(tenantId as string, produtoId),

    onMutate: async (produtoId) => {
      await cliente.cancelQueries({ queryKey: chave });
      const anterior = cliente.getQueryData(chave);

      cliente.setQueryData(chave, (atual: Awaited<ReturnType<typeof service.listarProdutos>>) =>
        (atual ?? []).map((p) => (p.id === produtoId ? { ...p, favorito: !p.favorito } : p)),
      );

      return { anterior };
    },

    onError: (_erro, _id, contexto) => {
      if (contexto?.anterior) cliente.setQueryData(chave, contexto.anterior);
    },

    onSettled: () => cliente.invalidateQueries({ queryKey: chave }),
  });
}
