import * as api from '../cashApi';
import { getHistoryPage, openCash } from '../cashService';
import { CashError } from '../cashTypes';

jest.mock('../cashApi', () => ({
  openShift: jest.fn(),
  listHistoryPage: jest.fn(),
}));

const openShift = api.openShift as jest.MockedFunction<typeof api.openShift>;
const listHistoryPage = api.listHistoryPage as jest.MockedFunction<typeof api.listHistoryPage>;

const shiftAPI = (i: number) => ({
  id: `s${i}`,
  date_label: 'Hoje',
  period_label: '08:00 → 18:00',
  total_cents: 0,
  difference_cents: 0,
});

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

describe('getHistoryPage', () => {
  it('pede um turno a mais para saber que há próxima página, e o descarta', async () => {
    listHistoryPage.mockResolvedValue(Array.from({ length: 21 }, (_, i) => shiftAPI(i)));

    const page = await getHistoryPage('t', 20);

    expect(listHistoryPage).toHaveBeenCalledWith('t', 20, 21);
    expect(page.shifts).toHaveLength(20);
    expect(page.nextOffset).toBe(40);
  });

  it('página incompleta é a última', async () => {
    listHistoryPage.mockResolvedValue([shiftAPI(1)]);

    const page = await getHistoryPage('t', 0);

    expect(page.shifts).toHaveLength(1);
    expect(page.nextOffset).toBeNull();
  });
});
