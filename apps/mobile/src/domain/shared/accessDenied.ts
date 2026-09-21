/**
 * O BANCO RECUSOU POR PERMISSÃO — e não por rede, nem por regra de negócio.
 *
 * Uma recusa por MÓDULO (ver `isAccessDenied`) quer dizer que o plano ou o
 * papel desta pessoa mudou DEPOIS que o app carregou as capacidades (ver
 * `20260917010000_role_module_rls.sql`).
 *
 * Antes, cada service convertia isso em `'network'`, e a tela ou calava ou
 * mandava "tentar de novo" para sempre numa ação que nunca mais ia passar.
 * Agora vira `ModuleAccessError`, que o handler global do react-query
 * (`AppProviders`) reconhece: avisa e recarrega plano e papel, e com isso o
 * módulo some da navegação.
 */
export class ModuleAccessError extends Error {
  constructor(message?: string) {
    super(message ?? 'access_denied');
    this.name = 'ModuleAccessError';
  }
}

/**
 * `42501` sozinho NÃO basta: o banco também o usa para regras de negócio
 * ("custo que repete todo mês só pode ser editado pelo portal ou app", "este
 * custo veio de uma entrada de estoque"), e essas têm que continuar chegando
 * à tela com a explicação própria de cada domínio.
 *
 * Perda de módulo tem só duas formas:
 *  - a política de RLS barrando a escrita — o PostgREST devolve a mensagem
 *    padrão do Postgres, "new row violates row-level security policy";
 *  - as funções do banco que conferem o módulo, que levantam sempre
 *    "sem permissão para <módulo>" (caixa, custos, vendas, estoque, produtos).
 */
const MODULE_DENIAL = [/row-level security/i, /^sem permissão para /i];

export function isAccessDenied(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (code !== '42501' || typeof message !== 'string') return false;
  return MODULE_DENIAL.some((pattern) => pattern.test(message));
}

/**
 * A primeira linha do `normalize` de cada domínio com módulo: a recusa por
 * permissão passa na frente da tradução para o erro do domínio.
 */
export function throwIfAccessDenied(error: unknown): void {
  if (error instanceof ModuleAccessError) throw error;
  if (isAccessDenied(error)) {
    const message = (error as { message?: unknown }).message;
    throw new ModuleAccessError(typeof message === 'string' ? message : undefined);
  }
}
