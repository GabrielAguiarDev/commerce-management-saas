import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { useSessionStore } from '@store/sessionStore';

import * as service from '../catalogService';
import type { NewProduct, ProductPageQuery, ProductsPage, ProductUpdate } from '../catalogTypes';

export const catalogoKeys = {
  all: ['catalogo'] as const,
  list: (tenantId: string) => [...catalogoKeys.all, 'lista', tenantId] as const,
  /** Prefixo de todas as listas paginadas (Produtos, Estoque, cada busca/chip). */
  pages: (tenantId: string) => [...catalogoKeys.all, 'paginas', tenantId] as const,
  facets: (tenantId: string) => [...catalogoKeys.all, 'facetas', tenantId] as const,
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

/**
 * A LISTA PAGINADA de Produtos e de Estoque — 20 por vez, mais ao rolar.
 *
 * A busca e o chip entram na CHAVE: cada combinação tem as próprias páginas
 * em cache, e voltar a um filtro já visto não recomeça do zero.
 * `keepPreviousData` mantém a lista anterior na tela enquanto a nova busca
 * chega, em vez de piscar para o esqueleto a cada letra.
 *
 * Tudo mora sob `catalogoKeys.all`: cadastrar, editar, favoritar e movimentar
 * estoque já invalidam esse prefixo, então a lista acompanha sem nada novo.
 */
export function useProductsPage(query: ProductPageQuery) {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useInfiniteQuery({
    queryKey: [
      ...catalogoKeys.pages(tenantId ?? 'sem-tenant'),
      query.filter,
      query.specialCategory ?? '',
      query.search.trim(),
    ] as const,
    queryFn: ({ pageParam }) => service.listProductsPage(query, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
    enabled: Boolean(tenantId),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

/** Os números do catálogo inteiro: total, rótulo do 3º chip, contadores do Estoque. */
export function useCatalogFacets() {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: catalogoKeys.facets(tenantId ?? 'sem-tenant'),
    queryFn: () => service.getFacets(),
    enabled: Boolean(tenantId),
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
  const pagesKey = catalogoKeys.pages(tenantId ?? 'sem-tenant');

  return useMutation({
    mutationFn: (productId: string) => service.toggleFavorite(tenantId as string, productId),

    onMutate: async (productId) => {
      await client.cancelQueries({ queryKey: key });
      await client.cancelQueries({ queryKey: pagesKey });
      const anterior = client.getQueryData(key);
      const paginasAnteriores = client.getQueriesData<InfiniteData<ProductsPage>>({
        queryKey: pagesKey,
      });

      const flip = <T extends { id: string; favorite: boolean }>(p: T): T =>
        p.id === productId ? { ...p, favorite: !p.favorite } : p;

      client.setQueryData(key, (current: Awaited<ReturnType<typeof service.listProducts>>) =>
        (current ?? []).map(flip),
      );
      // As listas paginadas também: a estrela da tela Produtos vem delas.
      client.setQueriesData<InfiniteData<ProductsPage>>({ queryKey: pagesKey }, (data) =>
        data
          ? { ...data, pages: data.pages.map((page) => ({ ...page, products: page.products.map(flip) })) }
          : data,
      );

      return { anterior, paginasAnteriores };
    },

    onError: (_erro, _id, contexto) => {
      if (contexto?.anterior) client.setQueryData(key, contexto.anterior);
      for (const [pageKey, data] of contexto?.paginasAnteriores ?? []) {
        client.setQueryData(pageKey, data);
      }
    },

    // O prefixo inteiro: no chip Favoritos, a estrela desligada tira o produto
    // da lista, e isso só a releitura resolve.
    onSettled: () => client.invalidateQueries({ queryKey: catalogoKeys.all }),
  });
}
