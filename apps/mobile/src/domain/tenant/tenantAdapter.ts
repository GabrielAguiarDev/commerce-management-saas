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

/** Só chaves que o app conhece entram no domínio — o resto é ruído do banco. */
function ehChaveConhecida(k: string): k is ChaveModulo {
  return (CHAVES_MODULO as readonly string[]).includes(k);
}

/**
 * `TenantAPI` → `Tenant`.
 *
 * Faz o que adapter faz: renomeia (`contact_phone` → `telefone`), coage
 * (`renews_at` string ISO → `Date`), defende contra nulo (`plan_name` ausente
 * cai no nome da chave do plano) e DESCARTA o que a tela não usa (`status`,
 * `monthly_fee` — cobrança é assunto do portal, não do app).
 */
export function toTenant(raw: TenantAPI): Tenant {
  const renova = raw.renews_at ? new Date(raw.renews_at) : null;

  return {
    id: raw.id,
    name: raw.name,
    segment: raw.segment,
    phone: raw.contact_phone,
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
  return {
    id: raw.id,
    name: raw.full_name,
    papel: raw.role_name ?? '—',
    acesso: raw.access_summary ?? '—',
    initials: initials(raw.full_name),
  };
}

export function toActivity(raw: ActivityAPI): Activity {
  return { id: raw.id, text: raw.description, quando: raw.happened_label };
}

export function toTenantUpdatePayload(name: string, phone: string): TenantUpdateAPI {
  return { name: name.trim(), contact_phone: phone.trim() || null };
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
export function deriveCapabilities(modules: readonly ChaveModulo[]): Capabilities {
  const tem = (k: ChaveModulo) => modules.includes(k);
  const hasAppAccess = tem('app');

  return {
    hasAppAccess,
    hasSales: hasAppAccess || tem('sales'),
    hasProducts: hasAppAccess || tem('products'),
    hasCash: tem('cash'),
    hasStock: tem('stock'),
    hasCosts: tem('costs'),
    hasReports: tem('reports'),
    hasSupport: tem('support'),
  };
}

/**
 * Resumo textual dos módulos para o card de plano em Configurações.
 * Ordem fixa (a do menu), não a que o banco devolveu — assim o texto não muda
 * sozinho entre duas cargas.
 */
const LABEL_ORDER: { key: ChaveModulo; label: string }[] = [
  { key: 'sales', label: 'Vendas' },
  { key: 'products', label: 'Produtos' },
  { key: 'cash', label: 'Caixa' },
  { key: 'stock', label: 'Estoque' },
  { key: 'costs', label: 'Custos' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'app', label: 'App' },
];

export function labelModules(modules: readonly ChaveModulo[]): string {
  const names = LABEL_ORDER.filter((m) => modules.includes(m.key)).map((m) => m.label);
  if (names.length === 0) return 'nenhum';
  if (names.length === 1) return names[0] as string;
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}
