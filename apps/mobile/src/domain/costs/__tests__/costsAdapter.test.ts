import type { CostAPI, MonthSummaryAPI } from '../costsApiTypes';
import {
  filterCosts,
  toCompetenceLabel,
  toCost,
  toCostPayload,
  toMonthlySummary,
} from '../costsAdapter';

const base: CostAPI = {
  id: 'cst_1',
  tenant_id: 'tnt_1',
  name: 'Aluguel da loja',
  amount_cents: 280000,
  kind: 'fixed',
  due_label: 'dia 5',
  from_stock: false,
  recurrence_id: 'rec_1',
  series_active: true,
  competence: '2026-09-01',
};

const avulso: Partial<CostAPI> = { recurrence_id: null, series_active: null, competence: null };

describe('toCusto', () => {
  it('traduz o enum do banco e monta o rótulo do chip', () => {
    const c = toCost(base);
    expect(c.type).toBe('fixed');
    expect(c.typeLabel).toBe('Fixo · todo mês');
    expect(c.recurring).toBe(true);
    expect(c.repeating).toBe(true);
    expect(c.competenceLabel).toBe('09/2026');
  });

  it('variável não ganha o "todo mês"', () => {
    expect(toCost({ ...base, ...avulso, kind: 'variable' }).typeLabel).toBe('Variável');
  });

  it('fixo avulso não promete repetição', () => {
    const c = toCost({ ...base, ...avulso });
    expect(c.typeLabel).toBe('Fixo');
    expect(c.recurring).toBe(false);
    expect(c.repeating).toBe(false);
    expect(c.competenceLabel).toBeNull();
  });

  it('lançamento de série encerrada guarda o mês, mas não diz que repete', () => {
    const c = toCost({ ...base, series_active: false });
    expect(c.typeLabel).toBe('Fixo');
    expect(c.recurring).toBe(true);
    expect(c.repeating).toBe(false);
    expect(c.competenceLabel).toBe('09/2026');
  });

  it('série sem status conhecido não é tratada como ativa', () => {
    expect(toCost({ ...base, series_active: null }).repeating).toBe(false);
  });

  it('enum desconhecido cai em variável em vez de sumir da lista', () => {
    expect(toCost({ ...base, kind: 'recurring_quarterly' }).type).toBe('variable');
  });

  it('defende contra nulos do banco', () => {
    const c = toCost({
      ...base,
      amount_cents: null,
      due_label: null,
      from_stock: null,
      ...avulso,
    });
    expect(c.amountCents).toBe(0);
    expect(c.quando).toBe('—');
    expect(c.fromStock).toBe(false);
    expect(c.recurring).toBe(false);
  });
});

describe('toCompetenceLabel', () => {
  it('mostra mês/ano da competência', () => {
    expect(toCompetenceLabel('2026-02-01')).toBe('02/2026');
    expect(toCompetenceLabel('2025-12-01')).toBe('12/2025');
  });

  it('ignora vazio e formatos inesperados', () => {
    expect(toCompetenceLabel(null)).toBeNull();
    expect(toCompetenceLabel('')).toBeNull();
    expect(toCompetenceLabel('2026-02')).toBeNull();
    expect(toCompetenceLabel('01/02/2026')).toBeNull();
  });
});

describe('toCostPayload', () => {
  it('leva a escolha de série mensal para um custo fixo', () => {
    expect(toCostPayload('tnt_1', '  Aluguel  ', 280000, 'fixed', true)).toEqual({
      tenant_id: 'tnt_1',
      name: 'Aluguel',
      amount_cents: 280000,
      kind: 'fixed',
      recurring: true,
    });
  });

  it('nunca marca custo variável como recorrente', () => {
    expect(toCostPayload('tnt_1', 'Feira', 15000, 'variable', true)).toMatchObject({
      kind: 'variable',
      recurring: false,
    });
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
    toCost({ ...base, ...avulso, id: 'cst_2', name: 'Energia', kind: 'variable' }),
    toCost({ ...base, ...avulso, id: 'cst_3', name: 'Feira', kind: 'variable' }),
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
