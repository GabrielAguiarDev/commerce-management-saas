import { ACTIVITIES_API, EQUIPE_API, TENANTS_API } from '@data/tenants';
import { delay } from '@services/mockLatency';

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

export async function fetchTenant(tenantId: string): Promise<TenantAPI | null> {
  await delay();
  return TENANTS_API[tenantId] ?? null;
}

export async function listTeam(tenantId: string): Promise<TeamMemberAPI[]> {
  await delay();
  return EQUIPE_API[tenantId] ?? [];
}

export async function listActivities(tenantId: string): Promise<ActivityAPI[]> {
  await delay();
  return ACTIVITIES_API[tenantId] ?? [];
}

export async function updateTenant(
  tenantId: string,
  payload: TenantUpdateAPI,
): Promise<TenantAPI | null> {
  await delay();
  const current = TENANTS_API[tenantId];
  if (!current) return null;
  // Mutação in-memory: o mock é o "banco" desta fase, e a tela precisa ver o
  // nome novo depois de salvar.
  const novo: TenantAPI = { ...current, name: payload.name, contact_phone: payload.contact_phone };
  TENANTS_API[tenantId] = novo;
  return novo;
}
