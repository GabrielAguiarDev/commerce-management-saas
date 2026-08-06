import { ATIVIDADES_API, EQUIPE_API, TENANTS_API } from '@data/tenants';
import { esperar } from '@services/mockLatency';

import type { ActivityAPI, TeamMemberAPI, TenantAPI, TenantUpdateAPI } from './tenantApiTypes';

/**
 * FRONTEIRA DE REDE do domínio `tenant`.
 *
 * ⚠️ ESTE É O ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA QUANDO O SUPABASE ENTRAR.
 * O corpo de cada função vira um `supabase.from(...).select(...)`; a assinatura
 * e o tipo de retorno (`TenantAPI`, cru) continuam idênticos. Adapter, service,
 * useCases e telas não são tocados.
 *
 * Só aqui existem latência simulada, relógio e aleatoriedade.
 */

export async function buscarTenant(tenantId: string): Promise<TenantAPI | null> {
  await esperar();
  return TENANTS_API[tenantId] ?? null;
}

export async function listarEquipe(tenantId: string): Promise<TeamMemberAPI[]> {
  await esperar();
  return EQUIPE_API[tenantId] ?? [];
}

export async function listarAtividades(tenantId: string): Promise<ActivityAPI[]> {
  await esperar();
  return ATIVIDADES_API[tenantId] ?? [];
}

export async function atualizarTenant(
  tenantId: string,
  payload: TenantUpdateAPI,
): Promise<TenantAPI | null> {
  await esperar();
  const atual = TENANTS_API[tenantId];
  if (!atual) return null;
  // Mutação in-memory: o mock é o "banco" desta fase, e a tela precisa ver o
  // nome novo depois de salvar.
  const novo: TenantAPI = { ...atual, name: payload.name, contact_phone: payload.contact_phone };
  TENANTS_API[tenantId] = novo;
  return novo;
}
