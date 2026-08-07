import * as api from './tenantApi';
import { toActivity, toMembro, toTenant, toTenantUpdatePayload } from './tenantAdapter';
import { TenantError, type Activity, type Membro, type Tenant } from './tenantTypes';

/**
 * AS REGRAS do domínio `tenant`.
 *
 * Chama o Api, passa pelo adapter e normaliza erro: nada que sai daqui é erro
 * cru de rede — é sempre `TenantError` com `codigo`. A tela mapeia código para
 * mensagem e não escreve um único `try/catch` de fetch.
 */

function normalize(error: unknown): never {
  if (error instanceof TenantError) throw error;
  throw new TenantError('network', error instanceof Error ? error.message : undefined);
}

export async function getTenant(tenantId: string): Promise<Tenant> {
  try {
    const raw = await api.fetchTenant(tenantId);
    if (!raw) throw new TenantError('not_found');
    return toTenant(raw);
  } catch (e) {
    return normalize(e);
  }
}

export async function getTeam(tenantId: string): Promise<Membro[]> {
  try {
    return (await api.listTeam(tenantId)).map(toMembro);
  } catch (e) {
    return normalize(e);
  }
}

export async function getActivities(tenantId: string): Promise<Activity[]> {
  try {
    return (await api.listActivities(tenantId)).map(toActivity);
  } catch (e) {
    return normalize(e);
  }
}

/**
 * Salvar dados do negócio. Valida ANTES de sair na rede: nome vazio nunca
 * chega ao servidor, e o erro que a tela recebe é do domínio, não do banco.
 */
export async function saveBusinessDetails(
  tenantId: string,
  name: string,
  phone: string,
): Promise<Tenant> {
  if (!name.trim()) throw new TenantError('unknown', 'O nome do negócio é obrigatório.');
  try {
    const raw = await api.updateTenant(tenantId, toTenantUpdatePayload(name, phone));
    // `null` aqui é o RLS recusando em silêncio (zero linhas afetadas), não um
    // negócio inexistente — ele acabou de ser lido para preencher o formulário.
    if (!raw) throw new TenantError('forbidden');
    return toTenant(raw);
  } catch (e) {
    return normalize(e);
  }
}
