/**
 * Identificadores das linhas criadas no navegador.
 *
 * Um contador em módulo, não `Date.now()` nem `crypto.randomUUID()`: as
 * sementes são montadas durante o render e precisam sair iguais no servidor e
 * no cliente, ou o React reclama de hidratação. Quando isto virar Supabase, o
 * id passa a vir do banco e este arquivo some.
 */
let atual = 1000;

export function proximoId(): number {
  return ++atual;
}
