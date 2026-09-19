import { retryOnLostConnection } from '../retryOnLostConnection';

const perdida = new TypeError('UnexpectedException: The network connection was lost.');
const ok = { ok: true } as Response;
const sempre = () => true;

describe('retryOnLostConnection', () => {
  it('não mexe numa requisição que deu certo', async () => {
    const base = jest.fn().mockResolvedValue(ok);

    await expect(retryOnLostConnection(base, sempre)('https://x/a')).resolves.toBe(ok);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('tenta de novo, uma vez, quando a conexão reaproveitada estava morta', async () => {
    const base = jest.fn().mockRejectedValueOnce(perdida).mockResolvedValueOnce(ok);

    await expect(
      retryOnLostConnection(base, sempre)('https://x/auth/v1/verify', { method: 'POST' }),
    ).resolves.toBe(ok);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it('desiste na segunda falha, devolvendo o erro', async () => {
    const base = jest.fn().mockRejectedValue(perdida);

    await expect(retryOnLostConnection(base, sempre)('https://x/a')).rejects.toBe(perdida);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it('não repete outros erros de rede', async () => {
    const semRede = new TypeError('The Internet connection appears to be offline.');
    const base = jest.fn().mockRejectedValue(semRede);

    await expect(retryOnLostConnection(base, sempre)('https://x/a')).rejects.toBe(semRede);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('não repete o que `podeRepetir` recusa', async () => {
    const base = jest.fn().mockRejectedValue(perdida);
    const podeRepetir = jest.fn().mockReturnValue(false);

    await expect(
      retryOnLostConnection(base, podeRepetir)('https://x/rest/v1/sales', { method: 'post' }),
    ).rejects.toBe(perdida);
    expect(podeRepetir).toHaveBeenCalledWith('https://x/rest/v1/sales', 'POST');
    expect(base).toHaveBeenCalledTimes(1);
  });
});
