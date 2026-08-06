import type { ProductAPI } from '../catalogApiTypes';
import { situacaoDoEstoque, toProduto, toProductCreatePayload } from '../catalogAdapter';

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
    expect(situacaoDoEstoque(0, 12)).toBe('zerado');
  });

  it('quantidade negativa também é zerado (estoque não fica devendo)', () => {
    expect(situacaoDoEstoque(-2, 5)).toBe('zerado');
  });

  it('baixo quando toca ou fura o mínimo', () => {
    expect(situacaoDoEstoque(3, 5)).toBe('baixo');
    expect(situacaoDoEstoque(5, 5)).toBe('baixo');
  });

  it('em dia acima do mínimo', () => {
    expect(situacaoDoEstoque(6, 5)).toBe('em_dia');
  });

  it('mínimo 0 significa "não me avise" — 1 unidade é em dia', () => {
    expect(situacaoDoEstoque(1, 0)).toBe('em_dia');
  });
});

describe('toProduto', () => {
  it('renomeia os campos do banco', () => {
    const p = toProduto(base);
    expect(p.nome).toBe('Ração premium cães 15kg');
    expect(p.codigo).toBe('7891');
    expect(p.precoCentavos).toBe(18990);
    expect(p.ehServico).toBe(false);
  });

  it('achata stock_qty/stock_min e deriva a situação', () => {
    expect(toProduto(base).estoque).toEqual({ quantidade: 8, minimo: 4, situacao: 'em_dia' });
  });

  it('distingue "não controla estoque" (null) de "acabou" (0)', () => {
    expect(toProduto({ ...base, stock_qty: null }).estoque).toBeNull();
    expect(toProduto({ ...base, stock_qty: 0 }).estoque).toMatchObject({ situacao: 'zerado' });
  });

  it('serviço nunca controla estoque, mesmo com quantidade no banco', () => {
    expect(toProduto({ ...base, is_service: true, stock_qty: 5 }).estoque).toBeNull();
  });

  it('preço nulo vira zero em vez de quebrar a formatação', () => {
    expect(toProduto({ ...base, price_cents: null }).precoCentavos).toBe(0);
  });

  it('produto nasce favorito quando a coluna vem nula', () => {
    expect(toProduto({ ...base, is_favorite: null }).favorito).toBe(true);
    expect(toProduto({ ...base, is_favorite: false }).favorito).toBe(false);
  });

  it('mínimo nulo conta como 0', () => {
    expect(toProduto({ ...base, stock_min: null }).estoque?.minimo).toBe(0);
  });

  it('descarta as colunas que a UI não usa', () => {
    const p = toProduto(base) as unknown as Record<string, unknown>;
    expect(p.tenant_id).toBeUndefined();
    expect(p.created_at).toBeUndefined();
    expect(p.updated_at).toBeUndefined();
  });
});

describe('toProductCreatePayload', () => {
  it('volta para o formato do banco, aparando o nome', () => {
    expect(
      toProductCreatePayload('tnt_1', {
        nome: '  Coleira nova  ',
        precoCentavos: 4590,
        custoCentavos: null,
        estoqueInicial: 10,
        estoqueMinimo: 2,
      }),
    ).toEqual({
      tenant_id: 'tnt_1',
      name: 'Coleira nova',
      price_cents: 4590,
      cost_cents: null,
      stock_qty: 10,
      stock_min: 2,
      is_service: false,
    });
  });

  it('propaga null de estoque como "não controla", não como zero', () => {
    const payload = toProductCreatePayload('tnt_1', {
      nome: 'Serviço',
      precoCentavos: 100,
      custoCentavos: null,
      estoqueInicial: null,
      estoqueMinimo: null,
    });
    expect(payload.stock_qty).toBeNull();
  });
});
