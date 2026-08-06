import { toProduto, toProductCreatePayload } from './catalogAdapter';
import * as api from './catalogApi';
import { CatalogoError, type NovoProduto, type Produto } from './catalogTypes';

/** AS REGRAS do catálogo. Valida antes da rede, normaliza o erro na saída. */

function normalizar(erro: unknown): never {
  if (erro instanceof CatalogoError) throw erro;
  throw new CatalogoError('rede', erro instanceof Error ? erro.message : undefined);
}

export async function listarProdutos(tenantId: string): Promise<Produto[]> {
  try {
    return (await api.listarProdutos(tenantId)).map(toProduto);
  } catch (e) {
    return normalizar(e);
  }
}

/**
 * Cadastro rápido.
 *
 * A única obrigatoriedade é o nome — exatamente como no protótipo. Preço em
 * branco vale zero (o dono digita depois) e preço negativo é erro: um produto
 * com preço negativo pagaria o cliente para levar.
 */
export function validarNovoProduto(novo: NovoProduto): CatalogoError | null {
  if (!novo.nome.trim()) return new CatalogoError('nome_obrigatorio');
  if (novo.precoCentavos < 0) return new CatalogoError('preco_invalido');
  return null;
}

export async function cadastrarProduto(tenantId: string, novo: NovoProduto): Promise<Produto> {
  const invalido = validarNovoProduto(novo);
  if (invalido) throw invalido;

  try {
    const raw = await api.criarProduto(toProductCreatePayload(tenantId, novo));
    return toProduto(raw);
  } catch (e) {
    return normalizar(e);
  }
}

export async function alternarFavorito(tenantId: string, produtoId: string): Promise<Produto> {
  try {
    const raw = await api.alternarFavorito(tenantId, produtoId);
    if (!raw) throw new CatalogoError('desconhecido', 'Produto não encontrado.');
    return toProduto(raw);
  } catch (e) {
    return normalizar(e);
  }
}

export async function movimentarEstoque(
  tenantId: string,
  produtoId: string,
  delta: number,
): Promise<void> {
  try {
    await api.movimentarEstoque(tenantId, produtoId, delta);
  } catch (e) {
    normalizar(e);
  }
}

export const categoriaEspecialDoTenant = api.categoriaEspecialDoTenant;
