import "server-only";

import type { Session } from "@/lib/sessao";

type Cliente = Extract<Session, { ok: true }>["supabase"];

/**
 * Registra uma ação no histórico do portal.
 *
 * ┌─ ESTA FUNÇÃO NUNCA FALHA, DE PROPÓSITO ────────────────────────────────┐
 * │ Ela é chamada DEPOIS que a operação de verdade já foi gravada. Se um    │
 * │ erro aqui subisse, o portal responderia "não foi possível registrar a   │
 * │ venda" sobre uma venda que está no banco — a pior mentira que uma tela  │
 * │ de balcão pode contar, porque manda refazer o que já foi feito.        │
 * │                                                                        │
 * │ Por isso o `catch` vazio e o retorno `void`: quem chama não tem decisão │
 * │ nenhuma a tomar com o resultado. Perder uma linha de histórico é um     │
 * │ problema pequeno; duplicar uma venda não é.                            │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * A CHAVE É SEMPRE `entidade.verbo`, em inglês e no passado: `sale.created`,
 * `stock.adjusted`, `employee.suspended`. O CHECK da coluna recusa qualquer
 * outro formato. O texto em português fica na tela (`ACTION_LABEL`), nunca no
 * banco — gravar o rótulo faria renomeá-lo reescrever o passado.
 *
 * O `summary` é a exceção e é texto pronto mesmo: ele descreve o registro
 * COMO ERA na hora. Remontá-lo depois, a partir do produto de hoje, daria o
 * nome de hoje para um evento de ontem.
 */
export async function logActivity(
  supabase: Cliente,
  action: string,
  detail?: { entityId?: string | null; summary?: string | null; metadata?: unknown },
): Promise<void> {
  try {
    await supabase.rpc("log_activity", {
      p_action: action,
      p_entity_id: detail?.entityId ?? null,
      p_summary: detail?.summary ?? null,
      p_metadata: (detail?.metadata ?? null) as never,
    });
  } catch {
    // Ver o cabeçalho: silêncio aqui é a escolha certa.
  }
}
