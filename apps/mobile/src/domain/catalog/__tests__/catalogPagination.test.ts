import { toFacets, toPageQueryAPI } from '../catalogAdapter';
import { specialCategoryFrom } from '../catalogSelectors';
import { listProductsPage } from '../catalogService';
import * as api from '../catalogApi';
import type { ProductAPI } from '../catalogApiTypes';

/**
 * A LISTA PAGINADA das telas Produtos e Estoque: o que a tela pede vira o
 * filtro de `list_products_page`, o 3º chip sai de `catalog_facets`, e o
 * "tem mais?" é decidido pedindo um item a mais.
 */

jest.mock('@services/supabase', () => ({ supabase: {} }));
jest.mock('../catalogApi', () => ({
  listProductsPage: jest.fn(),
}));

const listMock = api.listProductsPage as jest.MockedFunction<typeof api.listProductsPage>;

function productAPI(i: number): ProductAPI {
  return {
    id: `p${i}`,
    tenant_id: 't',
    name: `Item ${i}`,
    sku: null,
    price_cents: 100,
    cost_cents: null,
    is_service: false,
    is_favorite: false,
    stock_qty: null,
    stock_min: null,
    category: null,
    created_at: '2026-09-29T00:00:00Z',
    updated_at: null,
  };
}

describe('toPageQueryAPI', () => {
  it('chip "Serviços" vira is_service; outro rótulo vira a categoria', () => {
    expect(toPageQueryAPI({ search: '', filter: 'special', specialCategory: 'Serviços' }, 0, 21)).toMatchObject({
      filter: 'services',
      category: null,
    });
    expect(toPageQueryAPI({ search: '', filter: 'special', specialCategory: 'Bebidas' }, 0, 21)).toMatchObject({
      filter: 'category',
      category: 'Bebidas',
    });
  });

  it('chip especial sem rótulo não filtra nada, e a busca vai aparada', () => {
    expect(toPageQueryAPI({ search: '  ração ', filter: 'special', specialCategory: null }, 40, 21)).toEqual({
      search: 'ração',
      filter: 'all',
      category: null,
      offset: 40,
      limit: 21,
    });
  });

  it('a lista do Estoque passa direto', () => {
    expect(toPageQueryAPI({ search: '', filter: 'stock', specialCategory: null }, 0, 21).filter).toBe('stock');
  });
});

describe('specialCategoryFrom', () => {
  it('serviço cadastrado ganha de qualquer categoria', () => {
    expect(specialCategoryFrom({ hasServices: true, categories: [] })).toBe('Serviços');
  });

  it('a categoria mais comum, com empate em ordem alfabética', () => {
    expect(
      specialCategoryFrom({
        hasServices: false,
        categories: [
          { name: 'Salgados', count: 3 },
          { name: 'Bebidas', count: 3 },
          { name: 'Doces', count: 1 },
        ],
      }),
    ).toBe('Bebidas');
  });

  it('categoria única, ou nenhuma com 2 produtos, não vira chip', () => {
    expect(specialCategoryFrom({ hasServices: false, categories: [{ name: 'A', count: 9 }] })).toBeNull();
    expect(
      specialCategoryFrom({
        hasServices: false,
        categories: [
          { name: 'A', count: 1 },
          { name: 'B', count: 1 },
        ],
      }),
    ).toBeNull();
  });
});

describe('toFacets', () => {
  it('traz total, rótulo do chip e contadores do estoque', () => {
    expect(
      toFacets({
        total: 29,
        has_services: false,
        categories: [
          { name: 'Acessórios', count: 2 },
          { name: 'Rações', count: 1 },
        ],
        stock: { ok: 1, low: 2, out: 3 },
      }),
    ).toEqual({ total: 29, specialCategory: 'Acessórios', stock: { emDia: 1, low: 2, out: 3 } });
  });
});

describe('listProductsPage', () => {
  beforeEach(() => listMock.mockReset());

  it('pede um a mais para saber que há próxima página, e o descarta', async () => {
    listMock.mockResolvedValue(Array.from({ length: 21 }, (_, i) => productAPI(i)));

    const page = await listProductsPage({ search: '', filter: 'all', specialCategory: null }, 20);

    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ offset: 20, limit: 21 }));
    expect(page.products).toHaveLength(20);
    expect(page.nextOffset).toBe(40);
  });

  it('página incompleta é a última', async () => {
    listMock.mockResolvedValue([productAPI(1), productAPI(2)]);

    const page = await listProductsPage({ search: '', filter: 'all', specialCategory: null }, 0);

    expect(page.products).toHaveLength(2);
    expect(page.nextOffset).toBeNull();
  });
});
