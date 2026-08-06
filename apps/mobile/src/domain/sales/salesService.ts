import { totalCentavos } from './carrinho';
import * as api from './salesApi';
import { toResumoDoDia, toSaleCreatePayload, toVenda } from './salesAdapter';
import { VendaError, type ItemCarrinho, type ResumoDoDia, type Venda } from './salesTypes';

/** AS REGRAS das vendas. */

function normalizar(erro: unknown): never {
  if (erro instanceof VendaError) throw erro;
  throw new VendaError('rede', erro instanceof Error ? erro.message : undefined);
}

export async function listarVendasDoDia(tenantId: string): Promise<Venda[]> {
  try {
    return (await api.listarVendasDoDia(tenantId)).map(toVenda);
  } catch (e) {
    return normalizar(e);
  }
}

const RESUMO_VAZIO: ResumoDoDia = {
  totalCentavos: 0,
  lucroCentavos: 0,
  quantidadeDeVendas: 0,
  itensVendidos: 0,
  ticketMedioCentavos: 0,
  maisVendido: null,
};

export async function obterResumoDoDia(tenantId: string): Promise<ResumoDoDia> {
  try {
    const raw = await api.buscarResumoDoDia(tenantId);
    // Negócio sem venda hoje não é erro — é um dia que ainda vai começar.
    return raw ? toResumoDoDia(raw) : RESUMO_VAZIO;
  } catch (e) {
    return normalizar(e);
  }
}

/**
 * Finaliza a venda.
 *
 * `online` entra como argumento (não é lido de um store aqui dentro) porque
 * service não conhece React nem estado global: quem sabe da conexão é o
 * useCase, que passa o valor. É isso que mantém esta função testável no node.
 */
export async function finalizarVenda(
  tenantId: string,
  itens: readonly ItemCarrinho[],
  formaPagamento: string,
  online: boolean,
): Promise<Venda> {
  if (itens.length === 0) throw new VendaError('carrinho_vazio');
  if (!formaPagamento.trim()) throw new VendaError('sem_forma_de_pagamento');

  try {
    const raw = await api.registrarVenda(
      toSaleCreatePayload(tenantId, itens, formaPagamento, online),
    );
    return toVenda(raw);
  } catch (e) {
    return normalizar(e);
  }
}

export { totalCentavos };
