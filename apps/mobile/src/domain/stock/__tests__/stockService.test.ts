import * as api from '../stockApi';
import { listStockMovementsPage } from '../stockService';

jest.mock('../stockApi', () => ({
  listStockMovementsPage: jest.fn(),
}));

const listPage = api.listStockMovementsPage as jest.MockedFunction<typeof api.listStockMovementsPage>;

const movementAPI = (i: number) => ({
  id: `m${i}`,
  tenant_id: 't',
  product_id: 'p',
  product_name: 'Ração',
  delta: -1,
  reason: 'sale',
  actor_name: null,
  happened_label: 'agora',
});

beforeEach(() => jest.clearAllMocks());

describe('listStockMovementsPage', () => {
  it('pede uma movimentação a mais para saber que há próxima página, e a descarta', async () => {
    listPage.mockResolvedValue(Array.from({ length: 21 }, (_, i) => movementAPI(i)));

    const page = await listStockMovementsPage('t', 0);

    expect(listPage).toHaveBeenCalledWith('t', 0, 21);
    expect(page.movements).toHaveLength(20);
    expect(page.nextOffset).toBe(20);
  });

  it('página incompleta é a última', async () => {
    listPage.mockResolvedValue([movementAPI(1)]);

    expect((await listStockMovementsPage('t', 40)).nextOffset).toBeNull();
  });
});
