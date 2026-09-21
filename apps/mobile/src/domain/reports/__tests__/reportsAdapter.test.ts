import type { ReportAPI } from '../reportsApiTypes';
import { toBarras, toReport } from '../reportsAdapter';

describe('toBarras', () => {
  const week = [
    { day: '2026-09-14', day_label: 'seg', amount_cents: 52000 },
    { day: '2026-09-15', day_label: 'ter', amount_cents: 74000 },
    { day: '2026-09-16', day_label: 'qua', amount_cents: 61000 },
    { day: '2026-09-17', day_label: 'qui', amount_cents: 96000 },
    { day: '2026-09-18', day_label: 'sex', amount_cents: 118000 },
    { day: '2026-09-19', day_label: 'sáb', amount_cents: 130000 },
    { day: '2026-09-20', day_label: 'dom', amount_cents: 44000 },
  ];

  it('normaliza as alturas em proporção de 0 a 1', () => {
    const bars = toBarras(week);
    expect(bars.every((b) => b.ratio >= 0 && b.ratio <= 1)).toBe(true);
    expect(bars.find((b) => b.dia === 'sáb')?.ratio).toBe(1);
  });

  it('mantém a relação entre os dias do protótipo (52/130 no primeiro)', () => {
    const bars = toBarras(week);
    expect(bars[0]?.ratio).toBeCloseTo(52 / 130, 5);
  });

  it('usa a data como chave — num mês o dia da semana se repete', () => {
    const month = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(2026, 7, 22 + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { day: iso, day_label: 'seg', amount_cents: 0 };
    });
    const keys = toBarras(month).map((b) => b.key);
    expect(new Set(keys).size).toBe(30);
  });

  it('monta o dia do mês e o rótulo completo da exportação', () => {
    const [bar] = toBarras([{ day: '2026-09-04', day_label: 'sex', amount_cents: 100 }]);
    expect(bar?.diaDoMes).toBe('4');
    expect(bar?.rotuloCompleto).toBe('sex, 04/09');
  });

  it('destaca o maior dia — e só ele', () => {
    const destacadas = toBarras(week).filter((b) => b.destacada);
    expect(destacadas.map((b) => b.dia)).toEqual(['sáb']);
  });

  it('semana inteira zerada não vira divisão por zero', () => {
    const bars = toBarras([
      { day: '2026-09-14', day_label: 'seg', amount_cents: 0 },
      { day: '2026-09-15', day_label: 'ter', amount_cents: 0 },
    ]);
    expect(bars.every((b) => b.ratio === 0)).toBe(true);
    expect(bars.some((b) => b.destacada)).toBe(false);
    expect(bars.some((b) => Number.isNaN(b.ratio))).toBe(false);
  });

  it('lista vazia devolve lista vazia, sem quebrar', () => {
    expect(toBarras([])).toEqual([]);
  });
});

describe('toRelatorio', () => {
  const cru: ReportAPI = {
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
    daily_bars: [{ day: '2026-09-14', day_label: 'seg', amount_cents: 1000 }],
    top_products: [{ name: 'Ração', qty_label: '14 un', amount_cents: 265860 }],
  };

  const report = toReport(cru, 'week', { from: '2026-09-08', to: '2026-09-14' });

  it('formata o valor em dinheiro quando não há texto pronto', () => {
    expect(report.finance[0]?.formattedAmount).toBe('R$ 7.420,00');
  });

  it('usa o texto do servidor quando a linha não é dinheiro (margem em %)', () => {
    expect(report.finance[2]?.formattedAmount).toBe('51,3%');
  });

  it('crescer despesa é ATENÇÃO, não coisa boa — mesmo com variação positiva', () => {
    expect(report.finance[1]?.tone).toBe('warning');
    expect(report.finance[0]?.tone).toBe('positive');
  });

  it('pinta o valor pelo significado da linha, não pelo sinal do número', () => {
    expect(report.finance[1]?.highlight).toBe('negative');
    expect(report.finance[2]?.highlight).toBe('neutral');
  });

  it('variação ausente vira string vazia, não "null" na tela', () => {
    expect(report.finance[2]?.trend).toBe('');
  });
});
