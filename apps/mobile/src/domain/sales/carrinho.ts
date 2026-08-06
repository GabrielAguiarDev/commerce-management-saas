import { pluralizar } from '@utils/texto';

import type { ItemCarrinho } from './salesTypes';

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

export interface ProdutoParaCarrinho {
  id: string;
  nome: string;
  precoCentavos: number;
}

/** Adiciona; se o produto já está no carrinho, incrementa em vez de duplicar. */
export function adicionar(itens: ItemCarrinho[], produto: ProdutoParaCarrinho): ItemCarrinho[] {
  const existe = itens.some((i) => i.produtoId === produto.id);
  if (existe) return incrementar(itens, produto.id);

  return [
    ...itens,
    {
      produtoId: produto.id,
      nome: produto.nome,
      precoUnitarioCentavos: produto.precoCentavos,
      quantidade: 1,
    },
  ];
}

export function incrementar(itens: ItemCarrinho[], produtoId: string): ItemCarrinho[] {
  return itens.map((i) =>
    i.produtoId === produtoId ? { ...i, quantidade: i.quantidade + 1 } : i,
  );
}

/** Decrementa e REMOVE quando chega a zero — carrinho não guarda item com 0. */
export function decrementar(itens: ItemCarrinho[], produtoId: string): ItemCarrinho[] {
  return itens
    .map((i) => (i.produtoId === produtoId ? { ...i, quantidade: i.quantidade - 1 } : i))
    .filter((i) => i.quantidade > 0);
}

export function remover(itens: ItemCarrinho[], produtoId: string): ItemCarrinho[] {
  return itens.filter((i) => i.produtoId !== produtoId);
}

export function totalCentavos(itens: readonly ItemCarrinho[]): number {
  return itens.reduce((soma, i) => soma + i.precoUnitarioCentavos * i.quantidade, 0);
}

export function quantidadeTotal(itens: readonly ItemCarrinho[]): number {
  return itens.reduce((soma, i) => soma + i.quantidade, 0);
}

export function subtotalCentavos(item: ItemCarrinho): number {
  return item.precoUnitarioCentavos * item.quantidade;
}

/** "1 item no carrinho" / "3 itens no carrinho" — copy exata do protótipo. */
export function rotuloDoCarrinho(itens: readonly ItemCarrinho[]): string {
  return `${pluralizar(quantidadeTotal(itens), 'item', 'itens')} no carrinho`;
}

/** "2× Acarajé completo · 1× Água mineral" — resumo de uma linha. */
export function resumirItens(itens: readonly ItemCarrinho[]): string {
  return itens.map((i) => `${i.quantidade}× ${i.nome}`).join(' · ');
}
