/**
 * MODELO DE DOMÍNIO do negócio (tenant) e do que o plano dele libera.
 *
 * Este é o arquivo mais importante do app: os módulos NÃO são flags de demo,
 * são entitlements do plano contratado. Eles decidem a grade da tela "Mais", o
 * destino e o rótulo do 3º item da tab bar, quais cards aparecem no Início e
 * quais campos existem no cadastro rápido de produto.
 *
 * As chaves são exatamente as de `modules.key` no Supabase do monorepo
 * (ver supabase/migrations e apps/portal-client/lib/modulos.ts). Manter a mesma
 * grafia é o que vai permitir trocar o mock pela consulta real sem tradutor
 * intermediário — o adapter já fala a língua do banco.
 */

export const CHAVES_MODULO = [
  'sales',
  'products',
  'stock',
  'cash',
  'costs',
  'reports',
  'support',
  'app',
] as const;

export type ChaveModulo = (typeof CHAVES_MODULO)[number];

export interface Plano {
  /** 'free' | 'paid' | 'custom' no banco; aqui é texto por não ser regra. */
  key: string;
  name: string;
  renovaEm: Date | null;
}

export interface Tenant {
  id: string;
  name: string;
  segment: string | null;
  phone: string | null;
  plano: Plano;
  modules: ChaveModulo[];
}

/**
 * O que o plano libera, já traduzido para a linguagem das telas.
 *
 * Existe para que nenhuma tela precise perguntar `modulos.includes('cash')`:
 * a pergunta que a tela faz é "tem caixa?". Se amanhã o backend renomear a
 * chave, muda uma linha aqui.
 */
export interface Capabilities {
  /** Sem isto o app inteiro é bloqueado — é o módulo de ACESSO (`is_access`). */
  hasAppAccess: boolean;
  hasSales: boolean;
  hasProducts: boolean;
  hasCash: boolean;
  hasStock: boolean;
  hasCosts: boolean;
  hasReports: boolean;
  hasSupport: boolean;
}

export interface Membro {
  id: string;
  name: string;
  papel: string;
  acesso: string;
  initials: string;
}

export interface Activity {
  id: string;
  text: string;
  quando: string;
}

/**
 * `forbidden` = o banco recusou a escrita (RLS), não é falha de rede. Hoje é o
 * caso de salvar os dados do negócio: falta a política de UPDATE em `tenants`.
 * Ver o comentário em `tenantApi.updateTenant`.
 */
export type TenantErrorCode = 'not_found' | 'forbidden' | 'network' | 'unknown';

export class TenantError extends Error {
  constructor(readonly code: TenantErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'TenantError';
  }
}
