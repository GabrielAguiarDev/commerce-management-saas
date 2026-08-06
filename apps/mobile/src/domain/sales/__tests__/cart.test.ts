import {
  add,
  decrement,
  increment,
  totalQuantity,
  remove,
  summarizeItems,
  subtotalCents,
  totalCents,
} from '../cart';
import type { CartItem } from '../salesTypes';

const ACARAJE = { id: 'p1', name: 'Acarajé completo', priceCents: 1200 };
const AGUA = { id: 'p2', name: 'Água mineral', priceCents: 300 };

describe('adicionar', () => {
  it('insere o primeiro item com quantidade 1', () => {
    const items = add([], ACARAJE);
    expect(items).toEqual<CartItem[]>([
      { productId: 'p1', name: 'Acarajé completo', unitPriceCents: 1200, quantity: 1 },
    ]);
  });

  it('incrementa em vez de duplicar quando o produto já está no carrinho', () => {
    const items = add(add([], ACARAJE), ACARAJE);
    expect(items).toHaveLength(1);
    expect(items[0]?.quantity).toBe(2);
  });

  it('não muta a lista recebida', () => {
    const original: CartItem[] = [];
    add(original, ACARAJE);
    expect(original).toHaveLength(0);
  });

  it('preserva a ordem de entrada dos produtos', () => {
    const items = add(add(add([], ACARAJE), AGUA), ACARAJE);
    expect(items.map((i) => i.productId)).toEqual(['p1', 'p2']);
  });
});

describe('decrementar', () => {
  it('remove o item ao chegar em zero — carrinho não guarda quantidade 0', () => {
    const items = decrement(add([], ACARAJE), 'p1');
    expect(items).toHaveLength(0);
  });

  it('só mexe no produto pedido', () => {
    const cheio = add(add(add([], ACARAJE), ACARAJE), AGUA);
    const items = decrement(cheio, 'p1');
    expect(items.find((i) => i.productId === 'p1')?.quantity).toBe(1);
    expect(items.find((i) => i.productId === 'p2')?.quantity).toBe(1);
  });

  it('é inofensivo para id inexistente', () => {
    const cheio = add([], ACARAJE);
    expect(decrement(cheio, 'nao-existe')).toEqual(cheio);
  });
});

describe('incrementar e remover', () => {
  it('incrementa o item certo', () => {
    const items = increment(add(add([], ACARAJE), AGUA), 'p2');
    expect(items.find((i) => i.productId === 'p2')?.quantity).toBe(2);
  });

  it('remove independentemente da quantidade', () => {
    const cheio = increment(increment(add([], ACARAJE), 'p1'), 'p1');
    expect(remove(cheio, 'p1')).toHaveLength(0);
  });
});

describe('totais', () => {
  const cart = increment(add(add([], ACARAJE), AGUA), 'p1');

  it('soma preço × quantidade em centavos, sem erro de float', () => {
    // 2 × 12,00 + 1 × 3,00 = 27,00
    expect(totalCents(cart)).toBe(2700);
  });

  it('conta itens, não linhas', () => {
    expect(totalQuantity(cart)).toBe(3);
    expect(cart).toHaveLength(2);
  });

  it('não acumula erro de ponto flutuante em preços quebrados', () => {
    const centavos = [
      { id: 'a', name: 'a', priceCents: 10 },
      { id: 'b', name: 'b', priceCents: 20 },
    ].reduce<CartItem[]>((acc, p) => add(acc, p), []);
    // 0,10 + 0,20 em float daria 0,30000000000000004.
    expect(totalCents(centavos)).toBe(30);
  });

  it('calcula o subtotal da linha', () => {
    expect(subtotalCents(cart[0] as CartItem)).toBe(2400);
  });

  it('carrinho vazio soma zero', () => {
    expect(totalCents([])).toBe(0);
    expect(totalQuantity([])).toBe(0);
  });
});

describe('rótulos', () => {

  it('resume os itens no formato "2× Nome · 1× Nome"', () => {
    const cart = increment(add(add([], ACARAJE), AGUA), 'p1');
    expect(summarizeItems(cart)).toBe('2× Acarajé completo · 1× Água mineral');
  });
});
