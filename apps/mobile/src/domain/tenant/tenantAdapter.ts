import { iniciais } from '@utils/texto';

import type { ActivityAPI, TeamMemberAPI, TenantAPI, TenantUpdateAPI } from './tenantApiTypes';
import {
  CHAVES_MODULO,
  type Atividade,
  type Capacidades,
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
    nome: raw.name,
    segmento: raw.segment,
    telefone: raw.contact_phone,
    plano: {
      chave: raw.plan,
      nome: raw.plan_name ?? raw.plan,
      // Data inválida vinda do servidor não pode virar `Invalid Date` solto na
      // tela: some da UI como "sem data de renovação".
      renovaEm: renova && !Number.isNaN(renova.getTime()) ? renova : null,
    },
    modulos: (raw.modules ?? []).map((m) => m.key).filter(ehChaveConhecida),
  };
}

export function toMembro(raw: TeamMemberAPI): Membro {
  return {
    id: raw.id,
    nome: raw.full_name,
    papel: raw.role_name ?? '—',
    acesso: raw.access_summary ?? '—',
    iniciais: iniciais(raw.full_name),
  };
}

export function toAtividade(raw: ActivityAPI): Atividade {
  return { id: raw.id, texto: raw.description, quando: raw.happened_label };
}

export function toTenantUpdatePayload(nome: string, telefone: string): TenantUpdateAPI {
  return { name: nome.trim(), contact_phone: telefone.trim() || null };
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
export function derivarCapacidades(modulos: readonly ChaveModulo[]): Capacidades {
  const tem = (k: ChaveModulo) => modulos.includes(k);
  const acessoApp = tem('app');

  return {
    acessoApp,
    temVendas: acessoApp || tem('sales'),
    temProdutos: acessoApp || tem('products'),
    temCaixa: tem('cash'),
    temEstoque: tem('stock'),
    temCustos: tem('costs'),
    temRelatorios: tem('reports'),
    temSuporte: tem('support'),
  };
}

/**
 * Resumo textual dos módulos para o card de plano em Configurações.
 * Ordem fixa (a do menu), não a que o banco devolveu — assim o texto não muda
 * sozinho entre duas cargas.
 */
const ORDEM_ROTULOS: { chave: ChaveModulo; rotulo: string }[] = [
  { chave: 'sales', rotulo: 'Vendas' },
  { chave: 'products', rotulo: 'Produtos' },
  { chave: 'cash', rotulo: 'Caixa' },
  { chave: 'stock', rotulo: 'Estoque' },
  { chave: 'costs', rotulo: 'Custos' },
  { chave: 'reports', rotulo: 'Relatórios' },
  { chave: 'app', rotulo: 'App' },
];

export function rotularModulos(modulos: readonly ChaveModulo[]): string {
  const nomes = ORDEM_ROTULOS.filter((m) => modulos.includes(m.chave)).map((m) => m.rotulo);
  if (nomes.length === 0) return 'nenhum';
  if (nomes.length === 1) return nomes[0] as string;
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}
