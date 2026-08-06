import { movimentarEstoque as ajustarSaldoDoProduto } from '@domain/catalog/catalogService';

import * as api from './stockApi';
import { toMovimentacao, toMovimentacaoPayload } from './stockAdapter';
import { EstoqueError, type Movimentacao } from './stockTypes';

/** AS REGRAS das movimentações de estoque. */

function normalizar(erro: unknown): never {
  if (erro instanceof EstoqueError) throw erro;
  throw new EstoqueError('rede', erro instanceof Error ? erro.message : undefined);
}

export async function listarMovimentacoes(tenantId: string): Promise<Movimentacao[]> {
  try {
    return (await api.listarMovimentacoes(tenantId)).map(toMovimentacao);
  } catch (e) {
    return normalizar(e);
  }
}

/**
 * Registra a movimentação E ajusta o saldo do produto.
 *
 * Duas escritas que precisam andar juntas: no Supabase isso vira uma função
 * SQL única (como `admin_create_tenant` faz no portal), justamente para não
 * existir movimentação sem saldo ou saldo sem histórico. Enquanto é mock, o
 * service é quem garante a ordem — e o comentário fica aqui para que ninguém
 * "simplifique" tirando o segundo passo.
 */
export async function registrarMovimentacao(
  tenantId: string,
  produtoId: string | null,
  produtoNome: string,
  delta: number,
): Promise<Movimentacao> {
  if (!produtoNome.trim()) throw new EstoqueError('produto_obrigatorio');
  if (!Number.isInteger(delta) || delta === 0) throw new EstoqueError('quantidade_invalida');

  try {
    const raw = await api.criarMovimentacao(
      toMovimentacaoPayload(tenantId, produtoId, produtoNome, delta),
    );
    if (produtoId) await ajustarSaldoDoProduto(tenantId, produtoId, delta);
    return toMovimentacao(raw);
  } catch (e) {
    return normalizar(e);
  }
}
