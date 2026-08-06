import { contem, iniciais, normalizar, pluralizar } from '../texto';

describe('normalizar', () => {
  it('remove acento e caixa', () => {
    expect(normalizar('Acarajé Completo')).toBe('acaraje completo');
    expect(normalizar('  Vatapá  ')).toBe('vatapa');
  });
});

describe('contem', () => {
  it('acha produto acentuado a partir de busca sem acento', () => {
    expect(contem('Acarajé completo', 'acaraje')).toBe(true);
    expect(contem('Vatapá (porção)', 'porcao')).toBe(true);
  });

  it('busca vazia casa com tudo', () => {
    expect(contem('qualquer coisa', '')).toBe(true);
    expect(contem('qualquer coisa', '   ')).toBe(true);
  });

  it('não casa o que não existe', () => {
    expect(contem('Abará', 'ração')).toBe(false);
  });
});

describe('iniciais', () => {
  it('devolve uma letra por padrão', () => {
    expect(iniciais('Maria Aguiar')).toBe('M');
    expect(iniciais('Rita Andrade')).toBe('R');
  });

  it('devolve duas quando pedido', () => {
    expect(iniciais('Ana Beatriz', 2)).toBe('AB');
  });

  it('não quebra com nome vazio', () => {
    expect(iniciais('')).toBe('?');
    expect(iniciais('   ')).toBe('?');
  });
});

describe('pluralizar', () => {
  it('concorda em número', () => {
    expect(pluralizar(1, 'item', 'itens')).toBe('1 item');
    expect(pluralizar(0, 'item', 'itens')).toBe('0 itens');
    expect(pluralizar(3, 'unidade', 'unidades')).toBe('3 unidades');
  });
});
