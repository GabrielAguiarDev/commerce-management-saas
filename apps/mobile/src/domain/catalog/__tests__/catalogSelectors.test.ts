import { toProduct } from '../catalogAdapter';
import type { ProductAPI } from '../catalogApiTypes';
import {
  SALE_GRID_LIMIT,
  searchHasNoResults,
  casaBusca,
  filterCatalog,
  saleGrid,
  productsInStock,
  lowStockProducts,
  specialCategoryOf,
  stockSummary,
} from '../catalogSelectors';
import type { Product } from '../catalogTypes';

function api(p: Partial<ProductAPI> & Pick<ProductAPI, 'id' | 'name'>): ProductAPI {
  return {
    tenant_id: 'tnt_1',
    sku: null,
    price_cents: 1000,
    cost_cents: null,
    is_service: false,
    is_favorite: true,
    stock_qty: null,
    stock_min: null,
    category: null,
    created_at: '2026-07-26T09:00:00.000Z',
    updated_at: null,
    ...p,
  };
}

const CATALOGO = [
  api({ id: '1', name: 'Ração premium cães 15kg', sku: '7891', stock_qty: 8, stock_min: 4 }),
  api({ id: '2', name: 'Banho & tosa', sku: 'SERV1', is_service: true, category: 'Serviços' }),
  api({ id: '3', name: 'Coleira antipulgas', sku: '7892', stock_qty: 3, stock_min: 5 }),
  api({ id: '4', name: 'Areia higiênica 4kg', sku: '7893', stock_qty: 21, stock_min: 6 }),
  api({ id: '5', name: 'Sachê gato salmão', sku: '7894', stock_qty: 0, stock_min: 12 }),
  api({
    id: '6',
    name: 'Brinquedo mordedor',
    sku: '7895',
    stock_qty: 12,
    stock_min: 4,
    is_favorite: false,
  }),
  api({ id: '7', name: 'Shampoo neutro 500ml', sku: '7896', stock_qty: 6, stock_min: 3 }),
  api({ id: '8', name: 'Consulta veterinária', sku: 'SERV2', is_service: true, category: 'Serviços' }),
].map(toProduct);

describe('casaBusca', () => {
  const racao = CATALOGO[0]!;

  it('casa por nome, ignorando acento e caixa', () => {
    expect(casaBusca(racao, 'racao')).toBe(true);
    expect(casaBusca(racao, 'RAÇÃO')).toBe(true);
  });

  it('casa por código de barras', () => {
    expect(casaBusca(racao, '7891')).toBe(true);
  });

  it('busca vazia casa tudo', () => {
    expect(casaBusca(racao, '   ')).toBe(true);
  });

  it('não casa produto sem código quando se busca por código', () => {
    const semCodigo = toProduct(api({ id: 'x', name: 'Sem código' }));
    expect(casaBusca(semCodigo, '7891')).toBe(false);
  });
});

describe('filtrarCatalogo', () => {
  it('Todos devolve o catálogo inteiro', () => {
    expect(
      filterCatalog(CATALOGO, { search: '', filter: 'all', specialCategory: 'Serviços' }),
    ).toHaveLength(8);
  });

  it('Favoritos exclui o que foi desfavoritado', () => {
    const r = filterCatalog(CATALOGO, {
      search: '',
      filter: 'favorites',
      specialCategory: 'Serviços',
    });
    expect(r).toHaveLength(7);
    expect(r.some((p) => p.name === 'Brinquedo mordedor')).toBe(false);
  });

  it('o chip especial "Serviços" filtra por ehServico', () => {
    const r = filterCatalog(CATALOGO, {
      search: '',
      filter: 'special',
      specialCategory: 'Serviços',
    });
    expect(r.map((p) => p.name)).toEqual(['Banho & tosa', 'Consulta veterinária']);
  });

  it('o chip especial "Bebidas" filtra por categoria — o rótulo muda com o ramo', () => {
    const barraca = [
      api({ id: 'b1', name: 'Refrigerante lata', category: 'Bebidas' }),
      api({ id: 'b2', name: 'Acarajé completo', category: 'Comida' }),
    ].map(toProduct);

    const r = filterCatalog(barraca, {
      search: '',
      filter: 'special',
      specialCategory: 'Bebidas',
    });
    expect(r.map((p) => p.name)).toEqual(['Refrigerante lata']);
  });

  it('combina busca e chip', () => {
    const r = filterCatalog(CATALOGO, {
      search: 'consulta',
      filter: 'special',
      specialCategory: 'Serviços',
    });
    expect(r).toHaveLength(1);
  });
});

describe('gradeDeVenda', () => {
  it('sem busca mostra só os favoritos', () => {
    const r = saleGrid(CATALOGO, '');
    expect(r.some((p) => p.name === 'Brinquedo mordedor')).toBe(false);
  });

  it('com busca alcança até o não favoritado', () => {
    const r = saleGrid(CATALOGO, 'mordedor');
    expect(r.map((p) => p.name)).toEqual(['Brinquedo mordedor']);
  });

  it('nunca passa do limite de cartões da grade', () => {
    const muitos = Array.from({ length: 30 }, (_, i) =>
      toProduct(api({ id: `m${i}`, name: `Produto ${i}` })),
    );
    expect(saleGrid(muitos, '')).toHaveLength(SALE_GRID_LIMIT);
  });
});

describe('buscaSemResultado', () => {
  it('é verdadeiro só quando nem a busca acha nada', () => {
    expect(searchHasNoResults(CATALOGO, 'guarda-chuva')).toBe(true);
    expect(searchHasNoResults(CATALOGO, 'racao')).toBe(false);
  });

  it('catálogo só de não-favoritos NÃO é "nada encontrado"', () => {
    // Distinção que evita oferecer "Cadastrar produto" para quem só precisa
    // favoritar o que já tem.
    const noFavorites = [toProduct(api({ id: 'x', name: 'Item', is_favorite: false }))];
    expect(saleGrid(noFavorites, '')).toHaveLength(0);
    expect(searchHasNoResults(noFavorites, '')).toBe(false);
  });
});

describe('resumoDeEstoque', () => {
  it('reproduz os contadores do protótipo: 4 em dia, 1 baixo, 1 zerado', () => {
    expect(stockSummary(CATALOGO)).toEqual({ emDia: 4, low: 1, out: 1 });
  });

  it('ignora quem não controla estoque', () => {
    expect(productsInStock(CATALOGO)).toHaveLength(6);
  });

  it('soma zero num catálogo só de serviços', () => {
    const servicos = CATALOGO.filter((p) => p.ehServico);
    expect(stockSummary(servicos)).toEqual({ emDia: 0, low: 0, out: 0 });
  });
});

describe('produtosEmAlerta', () => {
  it('lista zerado antes de baixo', () => {
    expect(lowStockProducts(CATALOGO).map((p) => p.name)).toEqual([
      'Sachê gato salmão',
      'Coleira antipulgas',
    ]);
  });
});

/* -------------------------------------------------------------------------- */
/* specialCategoryOf — o rótulo do 3º chip                                     */
/* -------------------------------------------------------------------------- */

describe('specialCategoryOf', () => {
  const produto = (over: Partial<Product> = {}): Product => ({
    id: 'p',
    name: 'Item',
    code: null,
    priceCents: 1000,
    costCents: null,
    ehServico: false,
    favorite: true,
    stock: null,
    category: null,
    ...over,
  });

  it('serviço no catálogo vence tudo — o chip é "Serviços"', () => {
    // É a divisão que mais importa para quem vende as duas coisas: banho e
    // ração, no petshop.
    const list = [
      produto({ id: '1', ehServico: true }),
      produto({ id: '2', category: 'Ração' }),
      produto({ id: '3', category: 'Ração' }),
    ];
    expect(specialCategoryOf(list)).toBe('Serviços');
  });

  it('sem serviço, usa a categoria mais comum', () => {
    const list = [
      produto({ id: '1', category: 'Bebidas' }),
      produto({ id: '2', category: 'Bebidas' }),
      produto({ id: '3', category: 'Salgados' }),
    ];
    expect(specialCategoryOf(list)).toBe('Bebidas');
  });

  it('categoria única não vira chip — ela não separa nada', () => {
    // Um chip que seleciona o catálogo inteiro ocupa espaço sem filtrar.
    const list = [
      produto({ id: '1', category: 'Bebidas' }),
      produto({ id: '2', category: 'Bebidas' }),
    ];
    expect(specialCategoryOf(list)).toBeNull();
  });

  it('catálogo sem categoria nenhuma não tem chip', () => {
    expect(specialCategoryOf([produto({ id: '1' }), produto({ id: '2' })])).toBeNull();
  });

  it('catálogo vazio não quebra', () => {
    expect(specialCategoryOf([])).toBeNull();
  });

  it('ignora categoria que é só espaço em branco', () => {
    const list = [
      produto({ id: '1', category: '   ' }),
      produto({ id: '2', category: 'Bebidas' }),
      produto({ id: '3', category: 'Bebidas' }),
    ];
    expect(specialCategoryOf(list)).toBeNull();
  });
});
