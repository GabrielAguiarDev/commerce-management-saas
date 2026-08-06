import type { CostAPI, MonthSummaryAPI } from '../costsApiTypes';
import { filterCosts, toCost, toMonthlySummary } from '../costsAdapter';

const base: CostAPI = {
  id: 'cst_1',
  tenant_id: 'tnt_1',
  name: 'Aluguel da loja',
  amount_cents: 280000,
  kind: 'fixed',
  due_label: 'dia 5',
  from_stock: false,
};

describe('toCusto', () => {
  it('traduz o enum do banco e monta o rótulo do chip', () => {
    const c = toCost(base);
    expect(c.type).toBe('fixed');
    expect(c.typeLabel).toBe('Fixo · todo mês');
  });

  it('variável não ganha o "todo mês"', () => {
    expect(toCost({ ...base, kind: 'variable' }).typeLabel).toBe('Variável');
  });

  it('enum desconhecido cai em variável em vez de sumir da lista', () => {
    expect(toCost({ ...base, kind: 'recurring_quarterly' }).type).toBe('variable');
  });

  it('defende contra nulos do banco', () => {
    const c = toCost({ ...base, amount_cents: null, due_label: null, from_stock: null });
    expect(c.amountCents).toBe(0);
    expect(c.quando).toBe('—');
    expect(c.fromStock).toBe(false);
  });
});

describe('toResumoDoMes', () => {
  const cru: MonthSummaryAPI = {
    month_label: 'Julho',
    range_label: '1 a 26',
    income_cents: 2846000,
    expense_cents: 1498000,
  };

  it('DERIVA "sobrou" em vez de ler do servidor', () => {
    expect(toMonthlySummary(cru).sobrouCentavos).toBe(2846000 - 1498000);
  });

  it('mês sem lançamento nenhum devolve zeros, não NaN', () => {
    const empty = toMonthlySummary({ ...cru, income_cents: null, expense_cents: null });
    expect(empty).toMatchObject({ entrouCentavos: 0, saiuCentavos: 0, sobrouCentavos: 0 });
  });

  it('sobrou pode ser negativo — mês no vermelho é informação, não erro', () => {
    expect(toMonthlySummary({ ...cru, income_cents: 100, expense_cents: 500 }).sobrouCentavos).toBe(
      -400,
    );
  });
});

describe('filtrarCustos', () => {
  const costs = [
    toCost(base),
    toCost({ ...base, id: 'cst_2', name: 'Energia', kind: 'variable' }),
    toCost({ ...base, id: 'cst_3', name: 'Feira', kind: 'variable' }),
  ];

  it('Todos não filtra nada', () => {
    expect(filterCosts(costs, 'all')).toHaveLength(3);
  });

  it('separa fixos de variáveis', () => {
    expect(filterCosts(costs, 'fixed_only').map((c) => c.name)).toEqual(['Aluguel da loja']);
    expect(filterCosts(costs, 'variable_only').map((c) => c.name)).toEqual(['Energia', 'Feira']);
  });

  it('não muta a lista recebida', () => {
    filterCosts(costs, 'fixed_only');
    expect(costs).toHaveLength(3);
  });
});
