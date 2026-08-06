/** MODELO DE DOMÍNIO das vendas. */

export interface ItemCarrinho {
  produtoId: string;
  nome: string;
  precoUnitarioCentavos: number;
  quantidade: number;
}

export interface ItemVendido {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitarioCentavos: number;
}

export interface Venda {
  id: string;
  /** `HH:mm` já formatado pelo adapter — a tela não faz conta com data. */
  hora: string;
  itens: ItemVendido[];
  /** "2× Acarajé completo · 1× Água" — resumo pronto para a linha da lista. */
  resumoItens: string;
  formaPagamento: string;
  totalCentavos: number;
  /** Venda feita offline e ainda não confirmada pelo servidor. */
  pendenteDeSincronia: boolean;
}

export interface MaisVendido {
  nome: string;
  /** "24 unidades hoje". */
  detalhe: string;
}

export interface ResumoDoDia {
  totalCentavos: number;
  lucroCentavos: number;
  quantidadeDeVendas: number;
  itensVendidos: number;
  ticketMedioCentavos: number;
  maisVendido: MaisVendido | null;
}

export type CodigoErroVenda = 'carrinho_vazio' | 'sem_forma_de_pagamento' | 'rede' | 'desconhecido';

export class VendaError extends Error {
  constructor(readonly codigo: CodigoErroVenda, mensagem?: string) {
    super(mensagem ?? codigo);
    this.name = 'VendaError';
  }
}
