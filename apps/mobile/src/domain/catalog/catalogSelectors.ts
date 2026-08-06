import { contains } from '@utils/text';

import type { CatalogSortKey, Product } from './catalogTypes';

/**
 * Seletores puros do catálogo.
 *
 * Ficam no domínio (e não em `@data`) porque operam sobre o MODELO já
 * adaptado — `@data` guarda o formato cru da API. São funções puras, testadas
 * na suíte `logica`, e nenhuma delas conhece React.
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

/** Quantos itens a grade de venda mostra antes de exigir busca. */
export const SALE_GRID_LIMIT = 8;

/**
 * Grade da tela Vender.
 *
 * Sem busca, mostra só os favoritos — é a tela de "bate-rápido" de quem vende
 * no balcão, e o dono escolhe o que fica à mão favoritando. Com busca, o
 * catálogo inteiro entra na peneira. Em ambos os casos, no máximo 8 cartões:
 * mais que isso exige rolar, e rolar no meio da venda é o que se quer evitar.
 */
export function saleGrid(products: Product[], search: string): Product[] {
  const casados = products.filter((p) => casaBusca(p, search));
  const visiveis = search.trim() ? casados : casados.filter((p) => p.favorite);
  return visiveis.slice(0, SALE_GRID_LIMIT);
}

/**
 * `true` quando nem a busca nem o catálogo produziram resultado — o gatilho do
 * estado vazio "Nada encontrado / Cadastrar produto".
 *
 * Repara que olha para `casaBusca`, não para o resultado de `gradeDeVenda`:
 * um catálogo só de não-favoritos NÃO é "nada encontrado", é "nada favoritado".
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
