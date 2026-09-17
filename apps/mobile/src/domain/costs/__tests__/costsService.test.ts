import * as api from '../costsApi';
import type { CostAPI } from '../costsApiTypes';
import { toCost } from '../costsAdapter';
import { deleteCost, recordCost, updateCost } from '../costsService';
import { CostError } from '../costsTypes';

jest.mock('../costsApi', () => ({
  createCost: jest.fn(),
  updateCost: jest.fn(),
  deleteCost: jest.fn(),
  listCosts: jest.fn(),
  fetchMonthlySummary: jest.fn(),
}));

const createCost = api.createCost as jest.MockedFunction<typeof api.createCost>;
const apiUpdateCost = api.updateCost as jest.MockedFunction<typeof api.updateCost>;
const apiDeleteCost = api.deleteCost as jest.MockedFunction<typeof api.deleteCost>;

const saved: CostAPI = {
  id: 'cst_1',
  tenant_id: 'tnt_1',
  name: 'Aluguel',
  amount_cents: 280000,
  kind: 'fixed',
  due_label: 'dia 31',
  from_stock: false,
  recurrence_id: 'rec_1',
  series_active: true,
  competence: '2026-01-01',
  cost_date: '2026-01-31',
  category: null,
};

beforeEach(() => jest.clearAllMocks());

describe('recordCost', () => {
  it('pede a série mensal para um custo fixo que repete', async () => {
    createCost.mockResolvedValue(saved);

    const cost = await recordCost('tnt_1', 'Aluguel', 280000, 'fixed', true);

    expect(createCost).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'fixed', recurring: true, amount_cents: 280000 }),
    );
    expect(cost).toMatchObject({ repeating: true, competenceLabel: '01/2026' });
  });

  it('custo variável nunca vira série, mesmo se a tela mandar repetir', async () => {
    createCost.mockResolvedValue({
      ...saved,
      kind: 'variable',
      recurrence_id: null,
      series_active: null,
      competence: null,
    });

    await recordCost('tnt_1', 'Feira', 15000, 'variable', true);

    expect(createCost).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'variable', recurring: false }),
    );
  });

  it('valida antes de ir ao servidor', async () => {
    await expect(recordCost('tnt_1', '   ', 1000, 'fixed', true)).rejects.toMatchObject({
      code: 'name_required',
    });
    await expect(recordCost('tnt_1', 'Aluguel', 0, 'fixed', true)).rejects.toMatchObject({
      code: 'invalid_amount',
    });
    expect(createCost).not.toHaveBeenCalled();
  });

  it('erro do servidor (ex.: sem permissão na RPC) vira CostError de rede', async () => {
    createCost.mockRejectedValue(new Error('sem permissão para custos'));

    const attempt = recordCost('tnt_1', 'Aluguel', 1000, 'fixed', true);

    await expect(attempt).rejects.toBeInstanceOf(CostError);
    await expect(attempt).rejects.toMatchObject({ code: 'network' });
  });
});

describe('updateCost', () => {
  const series = toCost(saved);
  const changes = { name: 'Aluguel', amountCents: 300000, type: 'fixed' as const, recurring: true };

  it('manda o id e a data original para a RPC', async () => {
    apiUpdateCost.mockResolvedValue();

    await updateCost(series, changes);

    expect(apiUpdateCost).toHaveBeenCalledWith({
      id: 'cst_1',
      name: 'Aluguel',
      amount_cents: 300000,
      kind: 'fixed',
      category: null,
      cost_date: '2026-01-31',
      recurring: true,
    });
  });

  it('desligar a repetição chega à RPC como avulso', async () => {
    apiUpdateCost.mockResolvedValue();

    await updateCost(series, { ...changes, recurring: false });

    expect(apiUpdateCost).toHaveBeenCalledWith(expect.objectContaining({ recurring: false }));
  });

  it('custo de estoque é barrado antes da rede', async () => {
    await expect(updateCost({ ...series, fromStock: true }, changes)).rejects.toMatchObject({
      code: 'from_stock',
    });
    expect(apiUpdateCost).not.toHaveBeenCalled();
  });

  it('valida nome e valor antes da rede', async () => {
    await expect(updateCost(series, { ...changes, name: ' ' })).rejects.toMatchObject({
      code: 'name_required',
    });
    await expect(updateCost(series, { ...changes, amountCents: 0 })).rejects.toMatchObject({
      code: 'invalid_amount',
    });
    await expect(updateCost(series, { ...changes, amountCents: NaN })).rejects.toMatchObject({
      code: 'invalid_amount',
    });
    expect(apiUpdateCost).not.toHaveBeenCalled();
  });

  it('traduz o erro do servidor em código do domínio', async () => {
    apiUpdateCost.mockRejectedValue({ code: '42501', message: 'sem permissão para custos' });

    const attempt = updateCost(series, changes);

    await expect(attempt).rejects.toBeInstanceOf(CostError);
    await expect(attempt).rejects.toMatchObject({ code: 'forbidden' });
  });
});

describe('deleteCost', () => {
  it('série: avisa o histórico que parou de repetir', async () => {
    apiDeleteCost.mockResolvedValue();

    await deleteCost(toCost(saved));

    expect(apiDeleteCost).toHaveBeenCalledWith({
      id: 'cst_1',
      name: 'Aluguel',
      stops_repeating: true,
    });
  });

  it('avulso: exclui só a linha', async () => {
    apiDeleteCost.mockResolvedValue();

    await deleteCost(
      toCost({ ...saved, recurrence_id: null, series_active: null, competence: null }),
    );

    expect(apiDeleteCost).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cst_1', stops_repeating: false }),
    );
  });

  it('custo de estoque é barrado antes da rede', async () => {
    await expect(deleteCost(toCost({ ...saved, from_stock: true }))).rejects.toMatchObject({
      code: 'from_stock',
    });
    expect(apiDeleteCost).not.toHaveBeenCalled();
  });

  it('custo já removido vira not_found', async () => {
    apiDeleteCost.mockRejectedValue({ code: 'P0002', message: 'custo não encontrado' });

    await expect(deleteCost(toCost(saved))).rejects.toMatchObject({ code: 'not_found' });
  });
});
