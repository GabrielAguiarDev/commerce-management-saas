import type { ReportAPI } from '../reportsApiTypes';
import { toBarras, toRelatorio } from '../reportsAdapter';

describe('toBarras', () => {
  const semana = [
    { day_label: 'seg', amount_cents: 52000 },
    { day_label: 'ter', amount_cents: 74000 },
    { day_label: 'qua', amount_cents: 61000 },
    { day_label: 'qui', amount_cents: 96000 },
    { day_label: 'sex', amount_cents: 118000 },
    { day_label: 'sáb', amount_cents: 130000 },
    { day_label: 'dom', amount_cents: 44000 },
  ];

  it('normaliza as alturas em proporção de 0 a 1', () => {
    const barras = toBarras(semana);
    expect(barras.every((b) => b.proporcao >= 0 && b.proporcao <= 1)).toBe(true);
    expect(barras.find((b) => b.dia === 'sáb')?.proporcao).toBe(1);
  });

  it('mantém a relação entre os dias do protótipo (52/130 no primeiro)', () => {
    const barras = toBarras(semana);
    expect(barras[0]?.proporcao).toBeCloseTo(52 / 130, 5);
  });

  it('destaca o maior dia — e só ele', () => {
    const destacadas = toBarras(semana).filter((b) => b.destacada);
    expect(destacadas.map((b) => b.dia)).toEqual(['sáb']);
  });

  it('semana inteira zerada não vira divisão por zero', () => {
    const barras = toBarras([
      { day_label: 'seg', amount_cents: 0 },
      { day_label: 'ter', amount_cents: 0 },
    ]);
    expect(barras.every((b) => b.proporcao === 0)).toBe(true);
    expect(barras.some((b) => b.destacada)).toBe(false);
    expect(barras.some((b) => Number.isNaN(b.proporcao))).toBe(false);
  });

  it('lista vazia devolve lista vazia, sem quebrar', () => {
    expect(toBarras([])).toEqual([]);
  });
});

describe('toRelatorio', () => {
  const cru: ReportAPI = {
    period: 'semana',
    rows: [
      {
        key: 'income',
        label: 'Entrou',
        amount_cents: 742000,
        text_value: null,
        variation_label: '+12%',
        variation_tone: 'up_good',
      },
      {
        key: 'expense',
        label: 'Saiu',
        amount_cents: 361000,
        text_value: null,
        variation_label: '+4%',
        variation_tone: 'up_bad',
      },
      {
        key: 'margin',
        label: 'Margem',
        amount_cents: null,
        text_value: '51,3%',
        variation_label: null,
        variation_tone: null,
      },
    ],
    daily_bars: [{ day_label: 'seg', amount_cents: 1000 }],
    top_products: [{ name: 'Ração', qty_label: '14 un', amount_cents: 265860 }],
  };

  const relatorio = toRelatorio(cru, 'semana');

  it('formata o valor em dinheiro quando não há texto pronto', () => {
    expect(relatorio.financeiro[0]?.valorFormatado).toBe('R$ 7.420,00');
  });

  it('usa o texto do servidor quando a linha não é dinheiro (margem em %)', () => {
    expect(relatorio.financeiro[2]?.valorFormatado).toBe('51,3%');
  });

  it('crescer despesa é ATENÇÃO, não coisa boa — mesmo com variação positiva', () => {
    expect(relatorio.financeiro[1]?.tom).toBe('atencao');
    expect(relatorio.financeiro[0]?.tom).toBe('positivo');
  });

  it('pinta o valor pelo significado da linha, não pelo sinal do número', () => {
    expect(relatorio.financeiro[1]?.destaque).toBe('negativo');
    expect(relatorio.financeiro[2]?.destaque).toBe('neutro');
  });

  it('variação ausente vira string vazia, não "null" na tela', () => {
    expect(relatorio.financeiro[2]?.variacao).toBe('');
  });
});
