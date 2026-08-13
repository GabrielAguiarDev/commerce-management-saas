import { create } from 'zustand';

import * as cart from '@domain/sales/cart';
import type { CartProductInput } from '@domain/sales/cart';
import type { CartItem, SoldItem } from '@domain/sales/salesTypes';

interface CartState {
  items: CartItem[];
  paymentMethod: string;
  /**
   * A VENDA QUE ESTE CARRINHO VAI SUBSTITUIR.
   *
   * `null` no caminho normal. Preenchido quando a pessoa toca em "Editar
   * venda" no detalhe: os itens da venda antiga viram o carrinho e este campo
   * guarda de qual venda eles vieram. É ele, e só ele, que faz o botão do
   * carrinho estornar-e-registrar em vez de simplesmente registrar.
   *
   * Fica no CARRINHO e não numa prop de tela porque o carrinho sobrevive à
   * navegação: quem está editando pode ir a Produtos conferir um preço e
   * voltar. Uma edição guardada na tela morreria nesse passeio, e o botão
   * voltaria a "Finalizar venda" sem avisar ninguém — criando uma venda nova
   * e deixando a antiga de pé.
   */
  editingSaleId: string | null;

  add: (product: CartProductInput) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  setPaymentMethod: (method: string) => void;
  /** Abre uma venda existente PARA EDIÇÃO: troca o carrinho pelos itens dela. */
  startEditing: (sale: EditableSale) => void;
  /** A venda foi registrada: esvazia o carrinho. */
  checkout: () => void;
  /** Cancelamento explícito do carrinho em montagem (ou da edição). */
  cancel: () => void;
}

/** O que o carrinho precisa de uma venda para poder editá-la. */
export interface EditableSale {
  id: string;
  items: readonly SoldItem[];
  paymentMethod: string;
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
 *
 * Já houve um `lastSale` + `undo` aqui, para o Desfazer do toast de venda
 * registrada. Saíram junto com o botão: desfazer só o carrinho não desfazia a
 * venda, que a essa altura já está no banco com o estoque baixado. Ver
 * `CartSheet.checkout()`.
 */
export const useCartStore = create<CartState>()((set) => ({
  items: [],
  paymentMethod: 'Dinheiro',
  editingSaleId: null,

  add: (product) => set((s) => ({ items: cart.add(s.items, product) })),
  increment: (id) => set((s) => ({ items: cart.increment(s.items, id) })),
  decrement: (id) => set((s) => ({ items: cart.decrement(s.items, id) })),
  setPaymentMethod: (method) => set({ paymentMethod: method }),

  // SUBSTITUI o carrinho, não soma a ele. Editar uma venda com o carrinho de
  // outra venda pela metade dentro registraria as duas coisas juntas — e o
  // dono só descobriria no total do dia.
  startEditing: (sale) =>
    set({
      editingSaleId: sale.id,
      paymentMethod: sale.paymentMethod,
      items: sale.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        unitPriceCents: i.unitPriceCents,
        quantity: i.quantity,
      })),
    }),

  // As duas saídas do carrinho zeram a edição. Deixar o `editingSaleId` de pé
  // depois de finalizar faria a PRÓXIMA venda do balcão tentar substituir uma
  // venda que já foi substituída.
  checkout: () => set({ items: [], editingSaleId: null }),
  cancel: () => set({ items: [], editingSaleId: null }),
}));

export const selectItemCount = (s: CartState) => cart.totalQuantity(s.items);
export const selectTotalCents = (s: CartState) => cart.totalCents(s.items);
export const selectHasItems = (s: CartState) => s.items.length > 0;
