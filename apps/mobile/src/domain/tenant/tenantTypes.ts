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
  chave: string;
  nome: string;
  renovaEm: Date | null;
}

export interface Tenant {
  id: string;
  nome: string;
  segmento: string | null;
  telefone: string | null;
  plano: Plano;
  modulos: ChaveModulo[];
}

/**
 * O que o plano libera, já traduzido para a linguagem das telas.
 *
 * Existe para que nenhuma tela precise perguntar `modulos.includes('cash')`:
 * a pergunta que a tela faz é "tem caixa?". Se amanhã o backend renomear a
 * chave, muda uma linha aqui.
 */
export interface Capacidades {
  /** Sem isto o app inteiro é bloqueado — é o módulo de ACESSO (`is_access`). */
  acessoApp: boolean;
  temVendas: boolean;
  temProdutos: boolean;
  temCaixa: boolean;
  temEstoque: boolean;
  temCustos: boolean;
  temRelatorios: boolean;
  temSuporte: boolean;
}

export interface Membro {
  id: string;
  nome: string;
  papel: string;
  acesso: string;
  iniciais: string;
}

export interface Atividade {
  id: string;
  texto: string;
  quando: string;
}

export type CodigoErroTenant = 'nao_encontrado' | 'rede' | 'desconhecido';

export class TenantError extends Error {
  constructor(readonly codigo: CodigoErroTenant, mensagem?: string) {
    super(mensagem ?? codigo);
    this.name = 'TenantError';
  }
}
