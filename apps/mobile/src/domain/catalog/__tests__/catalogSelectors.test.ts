import { toProduto } from '../catalogAdapter';
import type { ProductAPI } from '../catalogApiTypes';
import {
  LIMITE_GRADE_VENDA,
  buscaSemResultado,
  casaBusca,
  filtrarCatalogo,
  gradeDeVenda,
  produtosComEstoque,
  produtosEmAlerta,
  resumoDeEstoque,
} from '../catalogSelectors';

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
].map(toProduto);

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
    const semCodigo = toProduto(api({ id: 'x', name: 'Sem código' }));
    expect(casaBusca(semCodigo, '7891')).toBe(false);
  });
});

describe('filtrarCatalogo', () => {
  it('Todos devolve o catálogo inteiro', () => {
    expect(
      filtrarCatalogo(CATALOGO, { busca: '', filtro: 'todos', categoriaEspecial: 'Serviços' }),
    ).toHaveLength(8);
  });

  it('Favoritos exclui o que foi desfavoritado', () => {
    const r = filtrarCatalogo(CATALOGO, {
      busca: '',
      filtro: 'favoritos',
      categoriaEspecial: 'Serviços',
    });
    expect(r).toHaveLength(7);
    expect(r.some((p) => p.nome === 'Brinquedo mordedor')).toBe(false);
  });

  it('o chip especial "Serviços" filtra por ehServico', () => {
    const r = filtrarCatalogo(CATALOGO, {
      busca: '',
      filtro: 'especial',
      categoriaEspecial: 'Serviços',
    });
    expect(r.map((p) => p.nome)).toEqual(['Banho & tosa', 'Consulta veterinária']);
  });

  it('o chip especial "Bebidas" filtra por categoria — o rótulo muda com o ramo', () => {
    const barraca = [
      api({ id: 'b1', name: 'Refrigerante lata', category: 'Bebidas' }),
      api({ id: 'b2', name: 'Acarajé completo', category: 'Comida' }),
    ].map(toProduto);

    const r = filtrarCatalogo(barraca, {
      busca: '',
      filtro: 'especial',
      categoriaEspecial: 'Bebidas',
    });
    expect(r.map((p) => p.nome)).toEqual(['Refrigerante lata']);
  });

  it('combina busca e chip', () => {
    const r = filtrarCatalogo(CATALOGO, {
      busca: 'consulta',
      filtro: 'especial',
      categoriaEspecial: 'Serviços',
    });
    expect(r).toHaveLength(1);
  });
});

describe('gradeDeVenda', () => {
  it('sem busca mostra só os favoritos', () => {
    const r = gradeDeVenda(CATALOGO, '');
    expect(r.some((p) => p.nome === 'Brinquedo mordedor')).toBe(false);
  });

  it('com busca alcança até o não favoritado', () => {
    const r = gradeDeVenda(CATALOGO, 'mordedor');
    expect(r.map((p) => p.nome)).toEqual(['Brinquedo mordedor']);
  });

  it('nunca passa do limite de cartões da grade', () => {
    const muitos = Array.from({ length: 30 }, (_, i) =>
      toProduto(api({ id: `m${i}`, name: `Produto ${i}` })),
    );
    expect(gradeDeVenda(muitos, '')).toHaveLength(LIMITE_GRADE_VENDA);
  });
});

describe('buscaSemResultado', () => {
  it('é verdadeiro só quando nem a busca acha nada', () => {
    expect(buscaSemResultado(CATALOGO, 'guarda-chuva')).toBe(true);
    expect(buscaSemResultado(CATALOGO, 'racao')).toBe(false);
  });

  it('catálogo só de não-favoritos NÃO é "nada encontrado"', () => {
    // Distinção que evita oferecer "Cadastrar produto" para quem só precisa
    // favoritar o que já tem.
    const nenhumFavorito = [toProduto(api({ id: 'x', name: 'Item', is_favorite: false }))];
    expect(gradeDeVenda(nenhumFavorito, '')).toHaveLength(0);
    expect(buscaSemResultado(nenhumFavorito, '')).toBe(false);
  });
});

describe('resumoDeEstoque', () => {
  it('reproduz os contadores do protótipo: 4 em dia, 1 baixo, 1 zerado', () => {
    expect(resumoDeEstoque(CATALOGO)).toEqual({ emDia: 4, baixo: 1, zerado: 1 });
  });

  it('ignora quem não controla estoque', () => {
    expect(produtosComEstoque(CATALOGO)).toHaveLength(6);
  });

  it('soma zero num catálogo só de serviços', () => {
    const servicos = CATALOGO.filter((p) => p.ehServico);
    expect(resumoDeEstoque(servicos)).toEqual({ emDia: 0, baixo: 0, zerado: 0 });
  });
});

describe('produtosEmAlerta', () => {
  it('lista zerado antes de baixo', () => {
    expect(produtosEmAlerta(CATALOGO).map((p) => p.nome)).toEqual([
      'Sachê gato salmão',
      'Coleira antipulgas',
    ]);
  });
});
