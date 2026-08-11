import type { QueuedSaleRow } from '../offlineQueueTypes';
import {
  decodeFailure,
  encodeFailure,
  relativeDay,
  toPendingSale,
  toQueuedSalePayload,
  toSaleCreateFromQueue,
} from '../offlineQueueAdapter';

function makeRow(overrides: Partial<QueuedSaleRow['sale']> = {}): QueuedSaleRow {
  return {
    sale: {
      local_id: 'aa11bb22-cc33-4d44-8e55-ff6677889900',
      tenant_id: 'tenant-1',
      payment_method: 'cash',
      total_cents: 3500,
      sold_at: '2026-08-11T14:32:00.000Z',
      status: 'pending',
      error_message: null,
      ...overrides,
    },
    items: [
      {
        local_id: 'aa11bb22-cc33-4d44-8e55-ff6677889900',
        product_id: 'prod-1',
        product_name: 'Ração Premium',
        qty: 2,
        unit_price_cents: 1500,
      },
      {
        local_id: 'aa11bb22-cc33-4d44-8e55-ff6677889900',
        product_id: null,
        product_name: 'Coleira avulsa',
        qty: 1,
        unit_price_cents: 500,
      },
    ],
  };
}

describe('toPendingSale', () => {
  it('monta o resumo dos itens e preserva o total em centavos', () => {
    const pending = toPendingSale(makeRow());

    expect(pending.itemsSummary).toBe('2× Ração Premium · 1× Coleira avulsa');
    expect(pending.totalCents).toBe(3500);
    expect(pending.localId).toBe('aa11bb22-cc33-4d44-8e55-ff6677889900');
  });

  it('o produto avulso (sem `product_id`) sobrevive pelo nome', () => {
    const pending = toPendingSale(makeRow());
    expect(pending.items[1]).toEqual({
      productId: '',
      name: 'Coleira avulsa',
      quantity: 1,
      unitPriceCents: 500,
    });
  });

  it('traz o motivo da falha decodificado', () => {
    const pending = toPendingSale(
      makeRow({
        status: 'error',
        error_message: 'insufficient_stock|Estoque insuficiente de Ração Premium',
      }),
    );

    expect(pending.status).toBe('error');
    expect(pending.failure).toEqual({
      code: 'insufficient_stock',
      detail: 'Estoque insuficiente de Ração Premium',
    });
  });
});

describe('relativeDay', () => {
  const now = new Date('2026-08-11T20:00:00.000Z');

  it('diz "hoje" para a venda do próprio dia', () => {
    expect(relativeDay('2026-08-11T09:00:00.000Z', now)).toBe('hoje');
  });

  it('diz "ontem" para a véspera', () => {
    expect(relativeDay('2026-08-10T09:00:00.000Z', now)).toBe('ontem');
  });

  it('usa dia/mês para o que é mais antigo', () => {
    expect(relativeDay('2026-08-02T09:00:00.000Z', now)).toBe('02/08');
  });

  it('não quebra com data inválida', () => {
    expect(relativeDay('nada disso', now)).toBe('');
  });
});

describe('encodeFailure / decodeFailure', () => {
  it('ida e volta preserva código e detalhe', () => {
    const failure = { code: 'insufficient_stock' as const, detail: 'faltou ração' };
    expect(decodeFailure(encodeFailure(failure))).toEqual(failure);
  });

  it('detalhe vazio volta como `null`, não como string vazia', () => {
    expect(decodeFailure(encodeFailure({ code: 'offline', detail: null }))).toEqual({
      code: 'offline',
      detail: null,
    });
  });

  it('o detalhe pode conter o separador sem se perder', () => {
    // A mensagem do Postgres não tem obrigação nenhuma de evitar o `|`.
    const failure = { code: 'unknown' as const, detail: 'coluna a|b inválida' };
    expect(decodeFailure(encodeFailure(failure))).toEqual(failure);
  });

  it('sem erro guardado, não há falha', () => {
    expect(decodeFailure(null)).toBeNull();
    expect(decodeFailure('')).toBeNull();
  });

  it('texto de uma versão anterior vira detalhe, sem inventar código', () => {
    expect(decodeFailure('erro antigo sem codigo')).toEqual({
      code: 'unknown',
      detail: 'erro antigo sem codigo',
    });
  });
});

describe('toSaleCreateFromQueue', () => {
  it('a venda da fila vira o MESMO payload de uma venda comum', () => {
    const payload = toSaleCreateFromQueue(makeRow());

    // O id local É o id da venda no servidor: é isso que impede a duplicata.
    expect(payload.id).toBe('aa11bb22-cc33-4d44-8e55-ff6677889900');
    // E a hora enviada é a da VENDA, não a da sincronização.
    expect(payload.sold_at).toBe('2026-08-11T14:32:00.000Z');
    expect(payload.total_cents).toBe(3500);
    expect(payload.items).toHaveLength(2);
  });
});

describe('toQueuedSalePayload', () => {
  it('soma o total a partir dos itens do carrinho', () => {
    const payload = toQueuedSalePayload(
      'local-1',
      '2026-08-11T14:32:00.000Z',
      'tenant-1',
      [
        { productId: 'p1', name: 'Ração', unitPriceCents: 1500, quantity: 2 },
        { productId: 'p2', name: 'Água', unitPriceCents: 500, quantity: 1 },
      ],
      'pix',
    );

    expect(payload.total_cents).toBe(3500);
    expect(payload.payment_method).toBe('pix');
    expect(payload.items[0]).toEqual({
      product_id: 'p1',
      product_name: 'Ração',
      qty: 2,
      unit_price_cents: 1500,
    });
  });
});
