import * as api from '../recoveryApi';
import { pedirCodigo, reenviarCodigo } from '../recoveryService';

jest.mock('../recoveryApi', () => ({
  sendRecoveryCode: jest.fn(),
  verifyRecoveryCode: jest.fn(),
  updatePassword: jest.fn(),
  discardRecoverySession: jest.fn(),
}));

const sendRecoveryCode = api.sendRecoveryCode as jest.MockedFunction<typeof api.sendRecoveryCode>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('pedirCodigo', () => {
  it('pede o código para o e-mail normalizado', async () => {
    sendRecoveryCode.mockResolvedValue();

    await expect(pedirCodigo('Dono@Loja.com.br ')).resolves.toBeDefined();

    expect(sendRecoveryCode).toHaveBeenCalledTimes(1);
    expect(sendRecoveryCode).toHaveBeenCalledWith('dono@loja.com.br');
  });

  it('não conta a falha do envio para a tela', async () => {
    sendRecoveryCode.mockRejectedValue(new Error('email rate limit exceeded'));

    await expect(pedirCodigo('dono@loja.com.br')).resolves.toBeDefined();
  });
});

describe('reenviarCodigo', () => {
  it('pede de novo para o mesmo endereço, sem contar a falha', async () => {
    sendRecoveryCode.mockResolvedValueOnce();
    await pedirCodigo('dono@loja.com.br');

    sendRecoveryCode.mockRejectedValueOnce(new Error('email rate limit exceeded'));
    await expect(reenviarCodigo()).resolves.toBeUndefined();

    expect(sendRecoveryCode).toHaveBeenLastCalledWith('dono@loja.com.br');
  });
});
