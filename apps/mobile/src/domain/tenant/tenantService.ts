import * as api from './tenantApi';
import { toAtividade, toMembro, toTenant, toTenantUpdatePayload } from './tenantAdapter';
import { TenantError, type Atividade, type Membro, type Tenant } from './tenantTypes';

/**
 * AS REGRAS do domínio `tenant`.
 *
 * Chama o Api, passa pelo adapter e normaliza erro: nada que sai daqui é erro
 * cru de rede — é sempre `TenantError` com `codigo`. A tela mapeia código para
 * mensagem e não escreve um único `try/catch` de fetch.
 */

function normalizar(erro: unknown): never {
  if (erro instanceof TenantError) throw erro;
  throw new TenantError('rede', erro instanceof Error ? erro.message : undefined);
}

export async function obterTenant(tenantId: string): Promise<Tenant> {
  try {
    const raw = await api.buscarTenant(tenantId);
    if (!raw) throw new TenantError('nao_encontrado');
    return toTenant(raw);
  } catch (e) {
    return normalizar(e);
  }
}

export async function obterEquipe(tenantId: string): Promise<Membro[]> {
  try {
    return (await api.listarEquipe(tenantId)).map(toMembro);
  } catch (e) {
    return normalizar(e);
  }
}

export async function obterAtividades(tenantId: string): Promise<Atividade[]> {
  try {
    return (await api.listarAtividades(tenantId)).map(toAtividade);
  } catch (e) {
    return normalizar(e);
  }
}

/**
 * Salvar dados do negócio. Valida ANTES de sair na rede: nome vazio nunca
 * chega ao servidor, e o erro que a tela recebe é do domínio, não do banco.
 */
export async function salvarDadosDoNegocio(
  tenantId: string,
  nome: string,
  telefone: string,
): Promise<Tenant> {
  if (!nome.trim()) throw new TenantError('desconhecido', 'O nome do negócio é obrigatório.');
  try {
    const raw = await api.atualizarTenant(tenantId, toTenantUpdatePayload(nome, telefone));
    if (!raw) throw new TenantError('nao_encontrado');
    return toTenant(raw);
  } catch (e) {
    return normalizar(e);
  }
}
