import { create } from 'zustand';

import * as cart from '@domain/sales/cart';
import type { CartProductInput } from '@domain/sales/cart';
import type { CartItem } from '@domain/sales/salesTypes';

interface CartState {
  items: CartItem[];
  paymentMethod: string;
  /**
   * Último carrinho finalizado, guardado só para o "Desfazer" do toast.
   * Some assim que o toast expira ou outra venda começa.
   */
  lastSale: CartItem[] | null;

  add: (product: CartProductInput) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  setPaymentMethod: (method: string) => void;
  /** Guarda o snapshot para o Desfazer e esvazia. */
  checkout: () => void;
  /** Cancelamento explícito: esvazia SEM snapshot — não há o que desfazer. */
  cancel: () => void;
  undo: () => void;
}

/**
 * O carrinho NÃO é persistido.
 *
 * Decisão consciente e igual à do protótipo: uma venda em montagem que
 * reaparece no dia seguinte é pior que uma venda perdida — o balconista
 * finalizaria sem perceber que há item de ontem no meio. Se um dia for
 * persistido, precisará de carimbo de tempo e descarte por turno.
 *
 * Toda a lógica vive em `@domain/sales/carrinho` (funções puras, testadas).
 * Este arquivo é só a casca que guarda o resultado.
 */
export const useCartStore = create<CartState>()((set) => ({
  items: [],
  paymentMethod: 'Dinheiro',
  lastSale: null,

  add: (product) => set((s) => ({ items: cart.add(s.items, product) })),
  increment: (id) => set((s) => ({ items: cart.increment(s.items, id) })),
  decrement: (id) => set((s) => ({ items: cart.decrement(s.items, id) })),
  setPaymentMethod: (method) => set({ paymentMethod: method }),

  checkout: () => set((s) => ({ items: [], lastSale: s.items })),
  cancel: () => set({ items: [], lastSale: null }),
  undo: () => set((s) => ({ items: s.lastSale ?? [], lastSale: null })),
}));

export const selectItemCount = (s: CartState) => cart.totalQuantity(s.items);
export const selectTotalCents = (s: CartState) => cart.totalCents(s.items);
export const selectHasItems = (s: CartState) => s.items.length > 0;
