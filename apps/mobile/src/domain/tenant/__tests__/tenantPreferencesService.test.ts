import * as api from '../tenantApi';
import {
  getAcceptedPaymentMethods,
  saveAcceptedPaymentMethods,
} from '../tenantService';

jest.mock('../tenantApi', () => ({
  fetchAcceptedPaymentMethods: jest.fn(),
  upsertAcceptedPaymentMethods: jest.fn(),
}));

const fetchAcceptedPaymentMethods = api.fetchAcceptedPaymentMethods as jest.MockedFunction<
  typeof api.fetchAcceptedPaymentMethods
>;
const upsertAcceptedPaymentMethods = api.upsertAcceptedPaymentMethods as jest.MockedFunction<
  typeof api.upsertAcceptedPaymentMethods
>;

beforeEach(() => jest.clearAllMocks());

describe('preferências de pagamento do negócio', () => {
  it('usa todas as formas quando o tenant ainda não criou a linha', async () => {
    fetchAcceptedPaymentMethods.mockResolvedValue(null);

    await expect(getAcceptedPaymentMethods('tenant-1')).resolves.toEqual([
      'cash',
      'pix',
      'debit',
      'credit',
    ]);
  });

  it('descarta valores desconhecidos e duplicados vindos do banco', async () => {
    fetchAcceptedPaymentMethods.mockResolvedValue(['pix', 'pix', '__invalid__', 'cash']);

    await expect(getAcceptedPaymentMethods('tenant-1')).resolves.toEqual(['pix', 'cash']);
  });

  it('não deixa o PDV ficar sem nenhuma forma de pagamento', async () => {
    await expect(saveAcceptedPaymentMethods('tenant-1', [])).rejects.toMatchObject({
      code: 'unknown',
    });
    expect(upsertAcceptedPaymentMethods).not.toHaveBeenCalled();
  });

  it('confirma o valor devolvido pelo servidor', async () => {
    upsertAcceptedPaymentMethods.mockResolvedValue(['pix', 'credit']);

    await expect(
      saveAcceptedPaymentMethods('tenant-1', ['pix', 'credit']),
    ).resolves.toEqual(['pix', 'credit']);
    expect(upsertAcceptedPaymentMethods).toHaveBeenCalledWith('tenant-1', ['pix', 'credit']);
  });

  it('trata zero linhas afetadas como recusa de permissão', async () => {
    upsertAcceptedPaymentMethods.mockResolvedValue(null);

    await expect(saveAcceptedPaymentMethods('tenant-1', ['cash'])).rejects.toMatchObject({
      code: 'forbidden',
    });
  });
});
