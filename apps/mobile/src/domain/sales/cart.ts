import type { CartItem } from './salesTypes';

/**
 * O CARRINHO É FUNÇÃO PURA.
 *
 * Nenhuma destas funções conhece React, store ou tela: recebem a lista de
 * itens e devolvem uma lista nova. O store (`@store/carrinhoStore`) é só a
 * casca que guarda o resultado.
 *
 * Foi feito assim porque carrinho é onde o dinheiro do cliente é contado — é a
 * lógica que mais precisa de teste e a que menos pode depender de simulador.
 */

export interface CartProductInput {
  id: string;
  name: string;
  priceCents: number;
}

/** Adiciona; se o produto já está no carrinho, incrementa em vez de duplicar. */
export function add(items: CartItem[], product: CartProductInput): CartItem[] {
  const existe = items.some((i) => i.productId === product.id);
  if (existe) return increment(items, product.id);

  return [
    ...items,
    {
      productId: product.id,
      name: product.name,
      unitPriceCents: product.priceCents,
      quantity: 1,
    },
  ];
}

export function increment(items: CartItem[], productId: string): CartItem[] {
  return items.map((i) =>
    i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i,
  );
}

/** Decrementa e REMOVE quando chega a zero — carrinho não guarda item com 0. */
export function decrement(items: CartItem[], productId: string): CartItem[] {
  return items
    .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i))
    .filter((i) => i.quantity > 0);
}

export function remove(items: CartItem[], productId: string): CartItem[] {
  return items.filter((i) => i.productId !== productId);
}

export function totalCents(items: readonly CartItem[]): number {
  return items.reduce((soma, i) => soma + i.unitPriceCents * i.quantity, 0);
}

export function totalQuantity(items: readonly CartItem[]): number {
  return items.reduce((soma, i) => soma + i.quantity, 0);
}

export function subtotalCents(item: CartItem): number {
  return item.unitPriceCents * item.quantity;
}

/** "2× Acarajé completo · 1× Água mineral" — resumo de uma linha. */
export function summarizeItems(items: readonly CartItem[]): string {
  return items.map((i) => `${i.quantity}× ${i.name}`).join(' · ');
}
