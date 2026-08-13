import { contains } from '@utils/text';

import type { CatalogSortKey, Product } from './catalogTypes';

/**
 * Seletores puros do catálogo.
 *
 * Operam sobre o MODELO já adaptado, nunca sobre o formato cru da API. São
 * funções puras, testadas na suíte `logica`, e nenhuma delas conhece React.
 */

/** Casa por nome OU por código, ignorando acento e caixa. Busca vazia casa tudo. */
export function casaBusca(product: Product, search: string): boolean {
  if (!search.trim()) return true;
  return contains(product.name, search) || contains(product.code ?? '', search);
}

/**
 * Lista da tela Produtos: busca + chip de filtro.
 *
 * O chip "special" é "Serviços" no petshop e "Bebidas" na barraca de acarajé.
 * Por isso o critério não é fixo: quando o rótulo é "Serviços" filtra por
 * `ehServico`; senão, filtra pela categoria de mesmo nome.
 */
export function filterCatalog(products: Product[], criterion: CatalogSortKey): Product[] {
  return products.filter((p) => {
    if (!casaBusca(p, criterion.search)) return false;
    if (criterion.filter === 'favorites') return p.favorite;
    if (criterion.filter === 'special') {
      const label = criterion.specialCategory;
      if (!label) return true;
      if (label === 'Serviços') return p.ehServico;
      return (p.category ?? '') === label;
    }
    return true;
  });
}

/**
 * O RÓTULO DO 3º CHIP da tela Produtos — "Serviços", "Bebidas", ou nenhum.
 *
 * Substitui o antigo `tenantSpecialCategory`, que na fase de mock era uma
 * tabela fixa de tenant → rótulo dentro do `catalogApi`. Isso não sobrevive ao
 * backend real: não existe (nem deve existir) uma coluna dizendo qual chip
 * mostrar. O rótulo é uma LEITURA DO CATÁLOGO, e por isso vira função pura.
 *
 * A regra, na ordem:
 *  1. tem serviço cadastrado? o chip é "Serviços" — é a divisão que mais
 *     importa para quem vende as duas coisas (banho e ração, no petshop);
 *  2. senão, a categoria mais comum do catálogo, desde que ela realmente
 *     separe algo: precisa cobrir ao menos 2 produtos e NÃO ser a única
 *     categoria existente. Um chip que seleciona o catálogo inteiro ocupa
 *     espaço sem filtrar nada;
 *  3. senão, `null` — e a tela simplesmente não mostra o terceiro chip.
 */
export function specialCategoryOf(products: Product[]): string | null {
  if (products.some((p) => p.ehServico)) return 'Serviços';

  const count = new Map<string, number>();
  for (const p of products) {
    const category = p.category?.trim();
    if (!category) continue;
    count.set(category, (count.get(category) ?? 0) + 1);
  }

  if (count.size < 2) return null;

  let best: string | null = null;
  let bestCount = 1;
  for (const [category, n] of count) {
    if (n > bestCount) {
      best = category;
      bestCount = n;
    }
  }

  return best;
}

/**
 * Grade da tela Vender.
 *
 * Mostra o CATÁLOGO INTEIRO peneirado pela busca — inclusive com a busca vazia.
 * Antes, sem busca a grade se limitava aos favoritos e cortava em 8 cartões, e
 * o resultado prático era uma tela de venda vazia para quem ainda não favoritou
 * nada: não dava para vender sem digitar.
 *
 * O favorito não sumiu, virou ORDEM: quem o dono deixou à mão aparece primeiro,
 * então o bate-rápido do balcão continua no topo e o resto fica a uma rolagem.
 * A ordem relativa dentro de cada grupo é a do catálogo (`sort` estável).
 */
export function saleGrid(products: Product[], search: string): Product[] {
  return products
    .filter((p) => casaBusca(p, search))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite));
}

/**
 * `true` quando nem a busca nem o catálogo produziram resultado — o gatilho do
 * estado vazio "Nada encontrado / Cadastrar produto".
 *
 * Repara que olha para `casaBusca`, não para o resultado de `saleGrid`: são a
 * mesma peneira, mas o vazio que interessa aqui é o da BUSCA, não o da grade.
 */
export function searchHasNoResults(products: Product[], search: string): boolean {
  return products.filter((p) => casaBusca(p, search)).length === 0;
}

export interface StockSummary {
  emDia: number;
  low: number;
  out: number;
}

export function stockSummary(products: Product[]): StockSummary {
  return products.reduce<StockSummary>(
    (acc, p) => {
      if (!p.stock) return acc;
      if (p.stock.status === 'out') return { ...acc, out: acc.out + 1 };
      if (p.stock.status === 'low') return { ...acc, low: acc.low + 1 };
      return { ...acc, emDia: acc.emDia + 1 };
    },
    { emDia: 0, low: 0, out: 0 },
  );
}

/** Só os que controlam estoque — a lista da tela Estoque. */
export function productsInStock(products: Product[]): Product[] {
  return products.filter((p) => p.stock !== null);
}

/** Os que pedem atenção, na ordem em que doem: zerados primeiro. */
export function lowStockProducts(products: Product[]): Product[] {
  return productsInStock(products)
    .filter((p) => p.stock?.status !== 'ok')
    .sort((a, b) => (a.stock?.quantity ?? 0) - (b.stock?.quantity ?? 0));
}
