import type { StockMovementAPI } from '../stockApiTypes';
import {
  formatSign,
  parseMovementQuantity,
  toStockMovement,
  toStockMovementPayload,
} from '../stockAdapter';

const base: StockMovementAPI = {
  id: 'mov_1',
  tenant_id: 'tnt_1',
  product_id: 'prd_c5',
  product_name: 'Sachê gato salmão',
  delta: -3,
  reason: 'sale',
  actor_name: null,
  happened_label: 'há 12 min',
};

describe('formatarSinal', () => {
  it('usa o traço tipográfico do design na saída, não o hífen ASCII', () => {
    expect(formatSign(-3)).toBe('−3');
    expect(formatSign(-3).charCodeAt(0)).toBe(0x2212);
  });

  it('marca a entrada com + explícito', () => {
    expect(formatSign(20)).toBe('+20');
  });
});

describe('toMovimentacao', () => {
  it('traduz o enum técnico em frase que o dono entende', () => {
    expect(toStockMovement(base).origem).toBe('saída automática por venda');
    expect(toStockMovement({ ...base, reason: 'purchase' }).origem).toBe(
      'entrada · virou custo variável',
    );
  });

  it('inclui o autor na perda, quando o servidor mandou', () => {
    expect(toStockMovement({ ...base, reason: 'loss', actor_name: 'Maria' }).origem).toBe(
      'perda registrada por Maria',
    );
    expect(toStockMovement({ ...base, reason: 'loss', actor_name: null }).origem).toBe(
      'perda registrada',
    );
  });

  it('motivo desconhecido vira ajuste manual em vez de sumir', () => {
    expect(toStockMovement({ ...base, reason: 'inventory_count' }).origem).toBe('ajuste manual');
  });
});

describe('lerQuantidadeMovimento', () => {
  it('aceita entrada com e sem sinal', () => {
    expect(parseMovementQuantity('10')).toBe(10);
    expect(parseMovementQuantity('+10')).toBe(10);
    expect(parseMovementQuantity('-3')).toBe(-3);
  });

  it('aceita o traço U+2212 que alguns teclados inserem', () => {
    // Se o "−3" virasse +3, o dono perderia o controle do próprio estoque.
    expect(parseMovementQuantity('−3')).toBe(-3);
  });

  it('recusa zero, decimal e texto', () => {
    expect(parseMovementQuantity('0')).toBeNull();
    expect(parseMovementQuantity('1,5')).toBeNull();
    expect(parseMovementQuantity('dez')).toBeNull();
    expect(parseMovementQuantity('')).toBeNull();
  });

  it('ignora espaço nas pontas', () => {
    expect(parseMovementQuantity('  +7 ')).toBe(7);
  });
});

describe('toStockMovementPayload', () => {
  const payload = (delta: number, custo: number | null) =>
    toStockMovementPayload('tnt_1', 'prd_1', ' Ração Golden ', delta, custo);

  it('entrada leva o custo — é o que vira despesa em costs', () => {
    expect(payload(10, 899).unit_cost_cents).toBe(899);
    expect(payload(10, 899).reason).toBe('purchase');
  });

  /**
   * O custo numa SAÍDA não tem significado: perda e ajuste não compram nada.
   * Deixá-lo passar lançaria despesa por mercadoria que sumiu — contando o
   * mesmo dinheiro duas vezes, uma na compra e outra na perda.
   */
  it('saída DESCARTA o custo, mesmo se ele vier preenchido', () => {
    expect(payload(-3, 899).unit_cost_cents).toBeNull();
    expect(payload(-3, 899).reason).toBe('manual');
  });

  it('entrada sem custo continua válida: nem toda entrada é compra', () => {
    expect(payload(10, null).unit_cost_cents).toBeNull();
  });

  it('apara o nome do produto — ele vira a descrição da despesa', () => {
    expect(payload(10, 100).product_name).toBe('Ração Golden');
  });
});
