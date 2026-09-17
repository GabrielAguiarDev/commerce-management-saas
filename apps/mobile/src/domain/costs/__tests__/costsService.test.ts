import * as api from '../costsApi';
import type { CostAPI } from '../costsApiTypes';
import { recordCost } from '../costsService';
import { CostError } from '../costsTypes';

jest.mock('../costsApi', () => ({
  createCost: jest.fn(),
  listCosts: jest.fn(),
  fetchMonthlySummary: jest.fn(),
}));

const createCost = api.createCost as jest.MockedFunction<typeof api.createCost>;

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
