import * as api from '../salesApi';
import * as queue from '../offlineQueueApi';
import { checkoutSale, syncPendingSales } from '../salesService';
import { SaleError } from '../salesTypes';
import type { QueuedSaleRow } from '../offlineQueueTypes';

/**
 * A ORQUESTRAÇÃO DA FILA, testada sem banco e sem rede.
 *
 * As duas fronteiras são trocadas por mocks — é justamente o que a separação
 * Api/Service compra: `salesService` só conhece as assinaturas, então a regra
 * ("subiu, sai da fila; falhou, fica com o motivo") pode ser verificada no node,
 * em milissegundos, sem simulador e sem Supabase.
 *
 * É o teste mais importante desta feature: aqui mora a promessa de que uma
 * venda não se perde e não entra duas vezes.
 */

jest.mock('../salesApi', () => ({
  recordSale: jest.fn(),
  saleHasItems: jest.fn(),
  completeSaleItems: jest.fn(),
}));

jest.mock('../offlineQueueApi', () => ({
  enqueue: jest.fn(),
  listQueue: jest.fn(),
  countQueued: jest.fn(),
  markStatus: jest.fn(),
  dequeue: jest.fn(),
}));

const recordSale = api.recordSale as jest.MockedFunction<typeof api.recordSale>;
const saleHasItems = api.saleHasItems as jest.MockedFunction<typeof api.saleHasItems>;
const completeSaleItems = api.completeSaleItems as jest.MockedFunction<
  typeof api.completeSaleItems
>;
const listQueue = queue.listQueue as jest.MockedFunction<typeof queue.listQueue>;
const enqueue = queue.enqueue as jest.MockedFunction<typeof queue.enqueue>;
const markStatus = queue.markStatus as jest.MockedFunction<typeof queue.markStatus>;
const dequeue = queue.dequeue as jest.MockedFunction<typeof queue.dequeue>;

function queued(localId: string, soldAt = '2026-08-11T14:00:00.000Z'): QueuedSaleRow {
  return {
    sale: {
      local_id: localId,
      tenant_id: 'tenant-1',
      payment_method: 'cash',
      total_cents: 1000,
      sold_at: soldAt,
      status: 'pending',
      error_message: null,
    },
    items: [
      {
        local_id: localId,
        product_id: 'prod-1',
        product_name: 'Ração',
        qty: 1,
        unit_price_cents: 1000,
      },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('checkoutSale offline', () => {
  it('grava na fila e NÃO toca na rede', async () => {
    enqueue.mockResolvedValue();

    const result = await checkoutSale(
      'tenant-1',
      [{ productId: 'p1', name: 'Ração', unitPriceCents: 1500, quantity: 2 }],
      'cash',
      false,
    );

    // Tentar a rede offline deixaria o balcão parado esperando o timeout.
    expect(recordSale).not.toHaveBeenCalled();
    expect(enqueue).toHaveBeenCalledTimes(1);

    expect(result.queued).toBe(true);
    if (!result.queued) throw new Error('esperava venda enfileirada');
    expect(result.pending.totalCents).toBe(3000);
    expect(result.pending.status).toBe('pending');
    // Nasce com identidade própria: é ela que impede a duplicata mais tarde.
    expect(result.pending.localId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('falhar ao GRAVAR NO APARELHO é erro de verdade, não confirmação', async () => {
    // O pior caso da feature: sem rede e sem disco. A venda não existe em lugar
    // nenhum, e a tela precisa saber disso para não confirmar nada.
    enqueue.mockRejectedValue(new Error('disk I/O error'));

    await expect(
      checkoutSale('tenant-1', [{ productId: 'p1', name: 'X', unitPriceCents: 100, quantity: 1 }], 'cash', false),
    ).rejects.toBeInstanceOf(SaleError);
  });

  it('carrinho vazio não vai para a fila', async () => {
    await expect(checkoutSale('tenant-1', [], 'cash', false)).rejects.toMatchObject({
      code: 'empty_cart',
    });
    expect(enqueue).not.toHaveBeenCalled();
  });
});

describe('syncPendingSales', () => {
  it('cada venda que sobe SAI da fila', async () => {
    listQueue.mockResolvedValue([queued('id-1'), queued('id-2')]);
    recordSale.mockResolvedValue({} as never);
    dequeue.mockResolvedValue();

    const summary = await syncPendingSales('tenant-1');

    expect(summary).toEqual({ synced: 2, failed: 0 });
    expect(dequeue).toHaveBeenCalledWith('id-1');
    expect(dequeue).toHaveBeenCalledWith('id-2');
  });

  it('envia a venda com o id local e a hora ORIGINAL da venda', async () => {
    listQueue.mockResolvedValue([queued('id-1', '2026-08-11T14:00:00.000Z')]);
    recordSale.mockResolvedValue({} as never);

    await syncPendingSales('tenant-1');

    expect(recordSale).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'id-1', sold_at: '2026-08-11T14:00:00.000Z' }),
    );
  });

  it('a venda recusada FICA na fila, marcada com o motivo', async () => {
    listQueue.mockResolvedValue([queued('id-1')]);
    recordSale.mockRejectedValue({
      code: 'P0001',
      message: 'Estoque insuficiente de Ração',
    });

    const summary = await syncPendingSales('tenant-1');

    expect(summary).toEqual({ synced: 0, failed: 1 });
    // O ponto central: recusar NÃO apaga. Descartar é decisão do usuário.
    expect(dequeue).not.toHaveBeenCalled();
    expect(markStatus).toHaveBeenCalledWith(
      'id-1',
      'error',
      'insufficient_stock|Estoque insuficiente de Ração',
    );
  });

  it('uma venda com erro não impede as outras de subirem', async () => {
    listQueue.mockResolvedValue([queued('id-1'), queued('id-2'), queued('id-3')]);
    recordSale
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce({ code: 'P0001', message: 'Estoque insuficiente' })
      .mockResolvedValueOnce({} as never);

    const summary = await syncPendingSales('tenant-1');

    expect(summary).toEqual({ synced: 2, failed: 1 });
    expect(dequeue).toHaveBeenCalledWith('id-1');
    expect(dequeue).toHaveBeenCalledWith('id-3');
    expect(dequeue).not.toHaveBeenCalledWith('id-2');
  });

  describe('quando o servidor diz que a venda JÁ EXISTE', () => {
    it('e ela subiu inteira: sai da fila sem reenviar item nenhum', async () => {
      listQueue.mockResolvedValue([queued('id-1')]);
      recordSale.mockRejectedValue({ code: '23505', message: 'duplicate key value' });
      saleHasItems.mockResolvedValue(true);

      const summary = await syncPendingSales('tenant-1');

      expect(summary).toEqual({ synced: 1, failed: 0 });
      // Reenviar os itens aqui descontaria o estoque DE NOVO.
      expect(completeSaleItems).not.toHaveBeenCalled();
      expect(dequeue).toHaveBeenCalledWith('id-1');
    });

    it('e ela ficou sem itens: completa a venda e só então sai da fila', async () => {
      // A tentativa anterior gravou o cabeçalho e morreu antes dos itens. Sem
      // este reparo ficaria no sistema uma venda de valor cheio, sem item
      // nenhum e sem ter tirado nada do estoque.
      listQueue.mockResolvedValue([queued('id-1')]);
      recordSale.mockRejectedValue({ code: '23505', message: 'duplicate key value' });
      saleHasItems.mockResolvedValue(false);
      completeSaleItems.mockResolvedValue();

      const summary = await syncPendingSales('tenant-1');

      expect(completeSaleItems).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'id-1' }),
      );
      expect(summary).toEqual({ synced: 1, failed: 0 });
      expect(dequeue).toHaveBeenCalledWith('id-1');
    });

    it('e o reparo falha: a venda continua na fila', async () => {
      listQueue.mockResolvedValue([queued('id-1')]);
      recordSale.mockRejectedValue({ code: '23505', message: 'duplicate key value' });
      saleHasItems.mockRejectedValue(new Error('Network request failed'));

      const summary = await syncPendingSales('tenant-1');

      expect(summary).toEqual({ synced: 0, failed: 1 });
      expect(dequeue).not.toHaveBeenCalled();
      expect(markStatus).toHaveBeenCalledWith(
        'id-1',
        'error',
        expect.stringContaining('offline|'),
      );
    });
  });

  it('fila vazia é um resumo zerado, não um erro', async () => {
    listQueue.mockResolvedValue([]);
    expect(await syncPendingSales('tenant-1')).toEqual({ synced: 0, failed: 0 });
  });
});
