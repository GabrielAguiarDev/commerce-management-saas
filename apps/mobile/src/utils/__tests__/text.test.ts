import { contains, initials, normalize } from '../text';

describe('normalizar', () => {
  it('remove acento e caixa', () => {
    expect(normalize('Acarajé Completo')).toBe('acaraje completo');
    expect(normalize('  Vatapá  ')).toBe('vatapa');
  });
});

describe('contem', () => {
  it('acha produto acentuado a partir de busca sem acento', () => {
    expect(contains('Acarajé completo', 'acaraje')).toBe(true);
    expect(contains('Vatapá (porção)', 'porcao')).toBe(true);
  });

  it('busca vazia casa com tudo', () => {
    expect(contains('qualquer coisa', '')).toBe(true);
    expect(contains('qualquer coisa', '   ')).toBe(true);
  });

  it('não casa o que não existe', () => {
    expect(contains('Abará', 'ração')).toBe(false);
  });
});

describe('iniciais', () => {
  it('devolve uma letra por padrão', () => {
    expect(initials('Maria Aguiar')).toBe('M');
    expect(initials('Rita Andrade')).toBe('R');
  });

  it('devolve duas quando pedido', () => {
    expect(initials('Ana Beatriz', 2)).toBe('AB');
  });

  it('não quebra com nome vazio', () => {
    expect(initials('')).toBe('?');
    expect(initials('   ')).toBe('?');
  });
});

