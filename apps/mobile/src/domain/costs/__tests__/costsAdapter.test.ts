import type { CostAPI, MonthSummaryAPI } from '../costsApiTypes';
import { filtrarCustos, toCusto, toResumoDoMes } from '../costsAdapter';

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
    const c = toCusto(base);
    expect(c.tipo).toBe('fixo');
    expect(c.rotuloTipo).toBe('Fixo · todo mês');
  });

  it('variável não ganha o "todo mês"', () => {
    expect(toCusto({ ...base, kind: 'variable' }).rotuloTipo).toBe('Variável');
  });

  it('enum desconhecido cai em variável em vez de sumir da lista', () => {
    expect(toCusto({ ...base, kind: 'recurring_quarterly' }).tipo).toBe('variavel');
  });

  it('defende contra nulos do banco', () => {
    const c = toCusto({ ...base, amount_cents: null, due_label: null, from_stock: null });
    expect(c.valorCentavos).toBe(0);
    expect(c.quando).toBe('—');
    expect(c.veioDoEstoque).toBe(false);
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
    expect(toResumoDoMes(cru).sobrouCentavos).toBe(2846000 - 1498000);
  });

  it('mês sem lançamento nenhum devolve zeros, não NaN', () => {
    const vazio = toResumoDoMes({ ...cru, income_cents: null, expense_cents: null });
    expect(vazio).toMatchObject({ entrouCentavos: 0, saiuCentavos: 0, sobrouCentavos: 0 });
  });

  it('sobrou pode ser negativo — mês no vermelho é informação, não erro', () => {
    expect(toResumoDoMes({ ...cru, income_cents: 100, expense_cents: 500 }).sobrouCentavos).toBe(
      -400,
    );
  });
});

describe('filtrarCustos', () => {
  const custos = [
    toCusto(base),
    toCusto({ ...base, id: 'cst_2', name: 'Energia', kind: 'variable' }),
    toCusto({ ...base, id: 'cst_3', name: 'Feira', kind: 'variable' }),
  ];

  it('Todos não filtra nada', () => {
    expect(filtrarCustos(custos, 'todos')).toHaveLength(3);
  });

  it('separa fixos de variáveis', () => {
    expect(filtrarCustos(custos, 'fixos').map((c) => c.nome)).toEqual(['Aluguel da loja']);
    expect(filtrarCustos(custos, 'variaveis').map((c) => c.nome)).toEqual(['Energia', 'Feira']);
  });

  it('não muta a lista recebida', () => {
    filtrarCustos(custos, 'fixos');
    expect(custos).toHaveLength(3);
  });
});
