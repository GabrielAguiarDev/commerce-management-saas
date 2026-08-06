import { create } from 'zustand';

import * as carrinho from '@domain/sales/carrinho';
import type { ProdutoParaCarrinho } from '@domain/sales/carrinho';
import type { ItemCarrinho } from '@domain/sales/salesTypes';

interface EstadoCarrinho {
  itens: ItemCarrinho[];
  formaPagamento: string;
  /**
   * Último carrinho finalizado, guardado só para o "Desfazer" do toast.
   * Some assim que o toast expira ou outra venda começa.
   */
  ultimaVenda: ItemCarrinho[] | null;

  adicionar: (produto: ProdutoParaCarrinho) => void;
  incrementar: (produtoId: string) => void;
  decrementar: (produtoId: string) => void;
  definirFormaPagamento: (forma: string) => void;
  /** Guarda o snapshot para o Desfazer e esvazia. */
  finalizar: () => void;
  /** Cancelamento explícito: esvazia SEM snapshot — não há o que desfazer. */
  cancelar: () => void;
  desfazer: () => void;
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
export const useCarrinhoStore = create<EstadoCarrinho>()((set) => ({
  itens: [],
  formaPagamento: 'Dinheiro',
  ultimaVenda: null,

  adicionar: (produto) => set((s) => ({ itens: carrinho.adicionar(s.itens, produto) })),
  incrementar: (id) => set((s) => ({ itens: carrinho.incrementar(s.itens, id) })),
  decrementar: (id) => set((s) => ({ itens: carrinho.decrementar(s.itens, id) })),
  definirFormaPagamento: (forma) => set({ formaPagamento: forma }),

  finalizar: () => set((s) => ({ itens: [], ultimaVenda: s.itens })),
  cancelar: () => set({ itens: [], ultimaVenda: null }),
  desfazer: () => set((s) => ({ itens: s.ultimaVenda ?? [], ultimaVenda: null })),
}));

export const selecionarQuantidade = (s: EstadoCarrinho) => carrinho.quantidadeTotal(s.itens);
export const selecionarTotal = (s: EstadoCarrinho) => carrinho.totalCentavos(s.itens);
export const selecionarTemItens = (s: EstadoCarrinho) => s.itens.length > 0;
