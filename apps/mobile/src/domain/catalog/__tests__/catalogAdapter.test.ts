import type { ProductAPI } from '../catalogApiTypes';
import {
  stockStatus,
  toProduct,
  toProductCreatePayload,
  toProductUpdatePayload,
} from '../catalogAdapter';

const base: ProductAPI = {
  id: 'prd_1',
  tenant_id: 'tnt_1',
  name: 'Ração premium cães 15kg',
  sku: '7891',
  price_cents: 18990,
  cost_cents: 13200,
  is_service: false,
  is_favorite: true,
  stock_qty: 8,
  stock_min: 4,
  category: 'Alimentação',
  created_at: '2026-07-26T09:00:00.000Z',
  updated_at: null,
};

describe('situacaoDoEstoque', () => {
  it('zerado tem precedência sobre baixo', () => {
    expect(stockStatus(0, 12)).toBe('out');
  });

  it('quantidade negativa também é zerado (estoque não fica devendo)', () => {
    expect(stockStatus(-2, 5)).toBe('out');
  });

  it('baixo quando toca ou fura o mínimo', () => {
    expect(stockStatus(3, 5)).toBe('low');
    expect(stockStatus(5, 5)).toBe('low');
  });

  it('em dia acima do mínimo', () => {
    expect(stockStatus(6, 5)).toBe('ok');
  });

  it('mínimo 0 significa "não me avise" — 1 unidade é em dia', () => {
    expect(stockStatus(1, 0)).toBe('ok');
  });
});

describe('toProduto', () => {
  it('renomeia os campos do banco', () => {
    const p = toProduct(base);
    expect(p.name).toBe('Ração premium cães 15kg');
    expect(p.code).toBe('7891');
    expect(p.priceCents).toBe(18990);
    expect(p.ehServico).toBe(false);
  });

  it('achata stock_qty/stock_min e deriva a situação', () => {
    expect(toProduct(base).stock).toEqual({ quantity: 8, minimo: 4, status: 'ok' });
  });

  it('distingue "não controla estoque" (null) de "acabou" (0)', () => {
    expect(toProduct({ ...base, stock_qty: null }).stock).toBeNull();
    expect(toProduct({ ...base, stock_qty: 0 }).stock).toMatchObject({ status: 'out' });
  });

  it('serviço nunca controla estoque, mesmo com quantidade no banco', () => {
    expect(toProduct({ ...base, is_service: true, stock_qty: 5 }).stock).toBeNull();
  });

  it('preço nulo vira zero em vez de quebrar a formatação', () => {
    expect(toProduct({ ...base, price_cents: null }).priceCents).toBe(0);
  });

  it('produto nasce favorito quando a coluna vem nula', () => {
    expect(toProduct({ ...base, is_favorite: null }).favorite).toBe(true);
    expect(toProduct({ ...base, is_favorite: false }).favorite).toBe(false);
  });

  it('mínimo nulo conta como 0', () => {
    expect(toProduct({ ...base, stock_min: null }).stock?.minimo).toBe(0);
  });

  it('descarta as colunas que a UI não usa', () => {
    const p = toProduct(base) as unknown as Record<string, unknown>;
    expect(p.tenant_id).toBeUndefined();
    expect(p.created_at).toBeUndefined();
    expect(p.updated_at).toBeUndefined();
  });
});

describe('toProductCreatePayload', () => {
  it('volta para o formato do banco, aparando o nome', () => {
    expect(
      toProductCreatePayload('tnt_1', {
        name: '  Coleira nova  ',
        code: ' 7891 ',
        priceCents: 4590,
        costCents: null,
        initialStock: 10,
        minimumStock: 2,
      }),
    ).toEqual({
      tenant_id: 'tnt_1',
      name: 'Coleira nova',
      sku: '7891',
      price_cents: 4590,
      cost_cents: null,
      stock_qty: 10,
      stock_min: 2,
      is_service: false,
    });
  });

  it('propaga null de estoque como "não controla", não como zero', () => {
    const payload = toProductCreatePayload('tnt_1', {
      name: 'Serviço',
      code: null,
      priceCents: 100,
      costCents: null,
      initialStock: null,
      minimumStock: null,
    });
    expect(payload.stock_qty).toBeNull();
  });

  it('código em branco vira null, e não string vazia', () => {
    const payload = toProductCreatePayload('tnt_1', {
      name: 'Sem código',
      code: '   ',
      priceCents: 100,
      costCents: null,
      initialStock: null,
      minimumStock: null,
    });
    expect(payload.sku).toBeNull();
  });
});

describe('toProductUpdatePayload', () => {
  it('apara nome e código, e não carrega quantidade de estoque', () => {
    const payload = toProductUpdatePayload({
      name: '  Coleira  ',
      code: '  7891  ',
      priceCents: 4590,
      costCents: 2000,
      minimumStock: 3,
    });

    expect(payload).toEqual({
      name: 'Coleira',
      sku: '7891',
      price_cents: 4590,
      cost_cents: 2000,
      stock_min: 3,
    });
    expect(payload).not.toHaveProperty('stock_qty');
  });

  it('mínimo nulo continua nulo — é "não mexe", não "zera"', () => {
    expect(
      toProductUpdatePayload({
        name: 'Serviço',
        code: null,
        priceCents: 100,
        costCents: null,
        minimumStock: null,
      }).stock_min,
    ).toBeNull();
  });
});
