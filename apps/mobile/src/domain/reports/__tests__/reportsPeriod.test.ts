import { eachDay, normalizeRange, previousRange, rangeLabel, resolveRange } from '../reportsPeriod';

const TODAY = '2026-09-21';

describe('resolveRange', () => {
  it('hoje é só o dia de hoje', () => {
    expect(resolveRange('today', null, TODAY)).toEqual({ from: TODAY, to: TODAY });
  });

  it('esta semana são os últimos 7 dias, hoje incluído', () => {
    expect(resolveRange('week', null, TODAY)).toEqual({ from: '2026-09-15', to: TODAY });
  });

  it('este mês começa no dia 1 do mês corrente — não 30 dias atrás', () => {
    expect(resolveRange('month', null, TODAY)).toEqual({ from: '2026-09-01', to: TODAY });
  });

  it('personalizado usa o intervalo escolhido', () => {
    const custom = { from: '2026-08-10', to: '2026-08-20' };
    expect(resolveRange('custom', custom, TODAY)).toEqual(custom);
  });

  it('personalizado sem escolha cai no mês', () => {
    expect(resolveRange('custom', null, TODAY)).toEqual({ from: '2026-09-01', to: TODAY });
  });
});

describe('normalizeRange', () => {
  it('põe as pontas em ordem', () => {
    expect(normalizeRange({ from: '2026-09-10', to: '2026-09-02' }, TODAY)).toEqual({
      from: '2026-09-02',
      to: '2026-09-10',
    });
  });

  it('não deixa o intervalo passar de hoje', () => {
    expect(normalizeRange({ from: '2026-09-20', to: '2026-09-30' }, TODAY).to).toBe(TODAY);
  });

  it('limita o tamanho a um ano', () => {
    const r = normalizeRange({ from: '2020-01-01', to: TODAY }, TODAY);
    expect(eachDay(r)).toHaveLength(366);
  });
});

describe('previousRange', () => {
  it('é a janela do mesmo tamanho logo antes, atravessando o mês', () => {
    expect(previousRange({ from: '2026-09-01', to: '2026-09-21' })).toEqual({
      from: '2026-08-11',
      to: '2026-08-31',
    });
  });
});

describe('eachDay', () => {
  it('lista cada dia, com as duas pontas', () => {
    expect(eachDay({ from: '2026-08-30', to: '2026-09-02' })).toEqual([
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
    ]);
  });
});

describe('rangeLabel', () => {
  it('mostra as duas datas, e o ano só quando não é o corrente', () => {
    expect(rangeLabel({ from: '2026-09-04', to: '2026-09-18' }, TODAY)).toBe('04/09 – 18/09');
    expect(rangeLabel({ from: '2025-12-20', to: '2026-01-05' }, TODAY)).toBe('20/12/2025 – 05/01');
  });

  it('uma data só quando o intervalo é de um dia', () => {
    expect(rangeLabel({ from: TODAY, to: TODAY }, TODAY)).toBe('21/09');
  });
});
