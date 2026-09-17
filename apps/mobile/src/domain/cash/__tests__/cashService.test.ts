import * as api from '../cashApi';
import { openCash } from '../cashService';
import { CashError } from '../cashTypes';

jest.mock('../cashApi', () => ({
  openShift: jest.fn(),
}));

const openShift = api.openShift as jest.MockedFunction<typeof api.openShift>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('openCash', () => {
  it('traduz a corrida do índice parcial para caixa já aberto', async () => {
    openShift.mockRejectedValue({
      code: '23505',
      message:
        'duplicate key value violates unique constraint "cash_registers_one_open_per_tenant"',
    });

    await expect(openCash('tenant-1')).rejects.toMatchObject({
      code: 'cash_already_open',
    });
  });

  it('não confunde outras violações únicas com caixa aberto', async () => {
    openShift.mockRejectedValue({ code: '23505', message: 'outra_constraint' });

    await expect(openCash('tenant-1')).rejects.toBeInstanceOf(CashError);
    await expect(openCash('tenant-1')).rejects.toMatchObject({ code: 'network' });
  });
});
