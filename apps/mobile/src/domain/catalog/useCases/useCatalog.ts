import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionStore } from '@store/sessionStore';

import * as service from '../catalogService';
import type { NewProduct, ProductUpdate } from '../catalogTypes';

export const catalogoKeys = {
  all: ['catalogo'] as const,
  list: (tenantId: string) => [...catalogoKeys.all, 'lista', tenantId] as const,
};

export function useCatalog() {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: catalogoKeys.list(tenantId ?? 'sem-tenant'),
    queryFn: () => service.listProducts(tenantId as string),
    enabled: Boolean(tenantId),
    // Catálogo muda quando alguém cadastra ou vende; 1 min evita refetch a
    // cada foco de tela sem deixar o balconista ver preço velho.
    staleTime: 60 * 1000,
  });
}

export function useCreateProduct() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const client = useQueryClient();

  return useMutation({
    mutationFn: (novo: NewProduct) => service.createProduct(tenantId as string, novo),
    onSuccess: () => client.invalidateQueries({ queryKey: catalogoKeys.all }),
  });
}

/**
 * Editar NÃO é otimista, ao contrário de favoritar: aqui muda preço, e um
 * preço que aparece alterado na lista e volta atrás depois é pior do que um
 * botão que demora meio segundo — o balconista pode ter vendido no meio.
 */
export function useUpdateProduct() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, ...mudanca }: ProductUpdate & { productId: string }) =>
      service.updateProduct(productId, mudanca),
    onSuccess: () => client.invalidateQueries({ queryKey: catalogoKeys.all }),
  });
}

/**
 * Favoritar é o toque mais frequente da tela Produtos: precisa responder na
 * hora. Por isso a atualização é OTIMISTA — a estrela vira antes da resposta,
 * e volta atrás se o servidor recusar. Sem isso, cada toque teria a latência
 * da rede e a lista pareceria travada.
 */
export function useToggleFavorite() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const client = useQueryClient();
  const key = catalogoKeys.list(tenantId ?? 'sem-tenant');

  return useMutation({
    mutationFn: (productId: string) => service.toggleFavorite(tenantId as string, productId),

    onMutate: async (productId) => {
      await client.cancelQueries({ queryKey: key });
      const anterior = client.getQueryData(key);

      client.setQueryData(key, (current: Awaited<ReturnType<typeof service.listProducts>>) =>
        (current ?? []).map((p) => (p.id === productId ? { ...p, favorite: !p.favorite } : p)),
      );

      return { anterior };
    },

    onError: (_erro, _id, contexto) => {
      if (contexto?.anterior) client.setQueryData(key, contexto.anterior);
    },

    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
}
