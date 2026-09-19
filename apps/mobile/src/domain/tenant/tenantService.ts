import * as api from './tenantApi';
import { toActivity, toMembro, toTenant, toTenantUpdatePayload } from './tenantAdapter';
import { TenantError, type Activity, type Membro, type Tenant } from './tenantTypes';
import {
  PAYMENT_METHODS,
  type DbPaymentMethod,
} from '@domain/shared/dbEnums';

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

function validPaymentMethods(raw: readonly string[] | null): DbPaymentMethod[] {
  const unique = (raw ?? []).filter(
    (method, index, all): method is DbPaymentMethod =>
      (PAYMENT_METHODS as readonly string[]).includes(method) && all.indexOf(method) === index,
  );

  return unique.length ? unique : [...PAYMENT_METHODS];
}

export async function getAcceptedPaymentMethods(tenantId: string): Promise<DbPaymentMethod[]> {
  try {
    return validPaymentMethods(await api.fetchAcceptedPaymentMethods(tenantId));
  } catch (e) {
    return normalize(e);
  }
}

export async function saveAcceptedPaymentMethods(
  tenantId: string,
  methods: readonly DbPaymentMethod[],
): Promise<DbPaymentMethod[]> {
  const unique = methods.filter((method, index, all) => all.indexOf(method) === index);
  if (unique.length === 0) {
    throw new TenantError('unknown', 'Aceite pelo menos uma forma de pagamento.');
  }

  try {
    const saved = await api.upsertAcceptedPaymentMethods(tenantId, unique);
    if (!saved) throw new TenantError('forbidden');
    return validPaymentMethods(saved);
  } catch (e) {
    return normalize(e);
  }
}

export async function getTenant(tenantId: string): Promise<Tenant> {
  try {
    const raw = await api.fetchTenant(tenantId);
    if (!raw) throw new TenantError('not_found');
    return toTenant(raw);
  } catch (e) {
    // Quando isto falha o app segue, mas com as capacidades VAZIAS — abas
    // apagadas, subtítulo "—" na Início. Na tela não há erro; em
    // desenvolvimento, o motivo vai para o log.
    if (__DEV__) console.warn('getTenant', e instanceof Error ? e.message : e);
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
