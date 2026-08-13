import { groupSalesByDay, rangeForFilter, rangeKey, saleDayKey } from '../salesHistory';
import type { Sale } from '../salesTypes';

/** Meio-dia local: longe das duas bordas do dia em qualquer fuso do Brasil. */
function local(year: number, month: number, day: number, hour = 12, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function sale(partial: Partial<Sale> & { id: string; soldAt: string }): Sale {
  return {
    time: '12:00',
    items: [],
    itemsSummary: '1× Café',
    paymentMethod: 'cash',
    totalCents: 1000,
    refunded: false,
    pendingSync: false,
    ...partial,
  };
}

const HOJE = new Date(2026, 7, 13, 15, 30); // 13 de agosto de 2026

describe('saleDayKey', () => {
  it('usa o dia do RELÓGIO LOCAL, não o dia em UTC', () => {
    // 21h no Brasil já é o dia seguinte em UTC. Se o corte fosse feito sobre o
    // ISO, esta venda cairia no cabeçalho de 14 de agosto.
    expect(saleDayKey(local(2026, 8, 13, 21, 5))).toBe('2026-08-13');
  });

  it('devolve string vazia para data inválida em vez de quebrar a lista', () => {
    expect(saleDayKey('nem-data-é')).toBe('');
  });
});

describe('groupSalesByDay', () => {
  it('junta as vendas do mesmo dia e preserva a ordem em que chegaram', () => {
    const days = groupSalesByDay(
      [
        sale({ id: 'a', soldAt: local(2026, 8, 13, 17) }),
        sale({ id: 'b', soldAt: local(2026, 8, 13, 9) }),
        sale({ id: 'c', soldAt: local(2026, 8, 11) }),
      ],
      HOJE,
    );

    expect(days).toHaveLength(2);
    expect(days[0]?.sales.map((s) => s.id)).toEqual(['a', 'b']);
    expect(days[1]?.sales.map((s) => s.id)).toEqual(['c']);
  });

  it('nomeia hoje e ontem, e deixa o resto sem nome próprio', () => {
    const days = groupSalesByDay(
      [
        sale({ id: 'a', soldAt: local(2026, 8, 13) }),
        sale({ id: 'b', soldAt: local(2026, 8, 12) }),
        sale({ id: 'c', soldAt: local(2026, 8, 11) }),
      ],
      HOJE,
    );

    expect(days.map((d) => d.relative)).toEqual(['today', 'yesterday', null]);
  });

  it('atravessa a virada do mês sem confundir ontem', () => {
    const days = groupSalesByDay([sale({ id: 'a', soldAt: local(2026, 7, 31) })], new Date(2026, 7, 1, 10));
    expect(days[0]?.relative).toBe('yesterday');
  });

  it('deixa a estornada NA LISTA mas fora do total do dia', () => {
    const days = groupSalesByDay(
      [
        sale({ id: 'a', soldAt: local(2026, 8, 13), totalCents: 5000 }),
        sale({ id: 'b', soldAt: local(2026, 8, 13), totalCents: 3000, refunded: true }),
      ],
      HOJE,
    );

    expect(days[0]?.sales).toHaveLength(2);
    expect(days[0]?.totalCents).toBe(5000);
    expect(days[0]?.saleCount).toBe(1);
    expect(days[0]?.refundedCount).toBe(1);
  });

  it('um dia só de estornadas aparece, com total zero', () => {
    const days = groupSalesByDay(
      [sale({ id: 'a', soldAt: local(2026, 8, 10), totalCents: 3000, refunded: true })],
      HOJE,
    );

    expect(days).toHaveLength(1);
    expect(days[0]?.totalCents).toBe(0);
    expect(days[0]?.saleCount).toBe(0);
  });

  it('descarta a venda com data ilegível em vez de criar um grupo sem cabeçalho', () => {
    const days = groupSalesByDay([sale({ id: 'a', soldAt: 'quinta-feira' })], HOJE);
    expect(days).toEqual([]);
  });

  it('lista vazia devolve lista vazia', () => {
    expect(groupSalesByDay([], HOJE)).toEqual([]);
  });
});

describe('rangeForFilter', () => {
  const AGORA = new Date(2026, 7, 13, 15, 30); // 13/08/2026, 15h30

  it('"todas" não tem limite nenhum', () => {
    expect(rangeForFilter('all', undefined, AGORA)).toEqual({ from: null, to: null });
  });

  it('"hoje" começa na meia-noite LOCAL e não tem fim', () => {
    const range = rangeForFilter('today', undefined, AGORA);
    expect(range.from).toBe(new Date(2026, 7, 13).toISOString());
    expect(range.to).toBeNull();
  });

  it('"mês atual" começa no dia 1º, mesmo consultado no último dia do mês', () => {
    const range = rangeForFilter('month', undefined, new Date(2026, 7, 31, 23, 50));
    expect(range.from).toBe(new Date(2026, 7, 1).toISOString());
  });

  it('o fim do período é a meia-noite do dia SEGUINTE — a venda das 23h entra', () => {
    const range = rangeForFilter(
      'custom',
      { from: new Date(2026, 7, 1), to: new Date(2026, 7, 13) },
      AGORA,
    );

    expect(range.from).toBe(new Date(2026, 7, 1).toISOString());
    expect(range.to).toBe(new Date(2026, 7, 14).toISOString());

    // A prova do motivo: uma venda das 23h59 do último dia cai DENTRO do
    // intervalo (`< to`). Com `to` na meia-noite do próprio dia 13, ela ficaria
    // de fora e o faturamento do período viria menor.
    const lateSale = new Date(2026, 7, 13, 23, 59).toISOString();
    expect(lateSale < (range.to as string)).toBe(true);
  });

  it('aceita o período pela metade — só "de" ou só "até"', () => {
    expect(rangeForFilter('custom', { from: new Date(2026, 7, 1), to: null }, AGORA).to).toBeNull();
    expect(
      rangeForFilter('custom', { from: null, to: new Date(2026, 7, 13) }, AGORA).from,
    ).toBeNull();
  });

  it('período invertido NÃO é corrigido em silêncio', () => {
    // De 20/08 até 10/08 devolve um intervalo vazio de propósito: a lista volta
    // sem nada e as datas ficam à vista para a pessoa notar o engano.
    const range = rangeForFilter(
      'custom',
      { from: new Date(2026, 7, 20), to: new Date(2026, 7, 10) },
      AGORA,
    );
    expect((range.from as string) > (range.to as string)).toBe(true);
  });
});

describe('rangeKey', () => {
  it('distingue dois recortes diferentes (é chave de cache)', () => {
    const hoje = rangeForFilter('today', undefined, new Date(2026, 7, 13));
    const mes = rangeForFilter('month', undefined, new Date(2026, 7, 13));
    expect(rangeKey(hoje)).not.toBe(rangeKey(mes));
  });

  it('o mesmo recorte dá sempre a mesma chave', () => {
    const a = rangeForFilter('all');
    const b = rangeForFilter('all');
    expect(rangeKey(a)).toBe(rangeKey(b));
  });
});
