import { relativeLabel } from '@utils/dates';
import { initials } from '@utils/text';

import type { ActivityAPI, TeamMemberAPI, TenantAPI, TenantUpdateAPI } from './tenantApiTypes';
import {
  CHAVES_MODULO,
  type Activity,
  type Capabilities,
  type ChaveModulo,
  type Membro,
  type Tenant,
} from './tenantTypes';
import { currentMessages } from '@i18n/active';
import type { Messages } from '@i18n/en';

/** Só chaves que o app conhece entram no domínio — o resto é ruído do banco. */
function ehChaveConhecida(k: string): k is ChaveModulo {
  return (CHAVES_MODULO as readonly string[]).includes(k);
}

/**
 * `TenantAPI` → `Tenant`.
 *
 * Faz o que adapter faz: coage (`renews_at` string ISO → `Date`), defende
 * contra nulo (`plan_name` ausente cai no nome da chave do plano) e DESCARTA o
 * que a tela não usa (`status`, `monthly_fee` — cobrança é assunto do portal,
 * não do app).
 */
export function toTenant(raw: TenantAPI): Tenant {
  const renova = raw.renews_at ? new Date(raw.renews_at) : null;

  return {
    id: raw.id,
    name: raw.name,
    segment: raw.segment,
    phone: raw.phone,
    plano: {
      key: raw.plan,
      name: raw.plan_name ?? raw.plan,
      // Data inválida vinda do servidor não pode virar `Invalid Date` solto na
      // tela: some da UI como "sem data de renovação".
      renovaEm: renova && !Number.isNaN(renova.getTime()) ? renova : null,
    },
    modules: (raw.modules ?? []).map((m) => m.key).filter(ehChaveConhecida),
  };
}

export function toMembro(raw: TeamMemberAPI): Membro {
  const t = currentMessages().team;
  const name = raw.full_name ?? t.noName;
  return {
    id: raw.id,
    name,
    papel: raw.role_name ?? '—',
    // O resumo de acesso sai do nome do papel: `roles.permissions` é um jsonb
    // cujo resumo legível é decisão de UI. O dono tem tudo.
    acesso: raw.is_owner ? t.fullAccess : (raw.role_name ?? '—'),
    initials: initials(name),
  };
}

/**
 * `ActivityAPI` → `Activity`.
 *
 * O rótulo relativo ("há 2 h") é calculado AQUI, e não no banco: ele depende de
 * quando a tela está sendo olhada, não de quando a linha foi gravada. É a mesma
 * `relativeLabel` que estoque e suporte usam — os três já divergiram uma vez.
 */
export function toActivity(raw: ActivityAPI): Activity {
  return {
    id: raw.id,
    action: raw.action,
    // Autor nulo é o funcionário removido depois: o registro do que ele fez
    // fica, e a tela precisa dizer alguma coisa no lugar do nome.
    autor: raw.actor_name ?? currentMessages().team.someone,
    detalhe: raw.summary ?? '',
    quando: relativeLabel(raw.created_at),
  };
}

export function toTenantUpdatePayload(name: string, phone: string): TenantUpdateAPI {
  return { name: name.trim(), phone: phone.trim() || null };
}

/**
 * A REGRA CENTRAL DO PRODUTO: plano → capacidades.
 *
 * Função pura e o único lugar do app que conhece as chaves de módulo. Toda
 * tela pergunta pela capacidade, nunca pela chave.
 *
 * `sales` e `products` são tratados como sempre presentes quando o app está
 * liberado: um cliente com acesso ao aplicativo mas sem vender nem cadastrar
 * produto não teria tela nenhuma para abrir — é o mesmo raciocínio que o portal
 * usa com `BASE_MODULES` (apps/portal-client/lib/modulos.ts).
 */
export function deriveCapabilities(
  modules: readonly ChaveModulo[],
  rolePermissions: readonly string[] = [],
  isOwner = true,
): Capabilities {
  const tem = (k: ChaveModulo) => modules.includes(k);
  const hasAppAccess = tem('app');
  const roleAllows = (k: ChaveModulo) => isOwner || rolePermissions.includes(k);

  return {
    hasAppAccess,
    hasSales: (hasAppAccess || tem('sales')) && roleAllows('sales'),
    hasProducts: (hasAppAccess || tem('products')) && roleAllows('products'),
    hasCash: tem('cash') && roleAllows('cash'),
    hasStock: tem('stock') && roleAllows('stock'),
    hasCosts: tem('costs') && roleAllows('costs'),
    hasReports: tem('reports') && roleAllows('reports'),
    // Suporte é a porta para pedir ajuda e mudar o plano; todo usuário que
    // pode abrir o app precisa alcançá-lo, independentemente do papel.
    hasSupport: hasAppAccess,
  };
}

/**
 * Resumo textual dos módulos para o card de plano em Configurações.
 * Ordem fixa (a do menu), não a que o banco devolveu — assim o texto não muda
 * sozinho entre duas cargas.
 */
const LABEL_ORDER = ['sales', 'products', 'cash', 'stock', 'costs', 'reports', 'app'] as const;

export function labelModules(
  modules: readonly ChaveModulo[],
  t: Messages = currentMessages(),
): string {
  const names = LABEL_ORDER.filter((k) => modules.includes(k)).map((k) => t.modules.names[k]);
  if (names.length === 0) return t.modules.none;
  if (names.length === 1) return names[0] as string;
  return t.modules.list(names.slice(0, -1).join(', '), names[names.length - 1] as string);
}
