import { supabase } from '@services/supabase';

/**
 * REGISTRA UMA AÇÃO NO HISTÓRICO — `activity_log`, via `log_activity`.
 *
 * O app não grava na tabela: ela não tem policy de INSERT, de propósito. Quem
 * grava é a função `log_activity`, que carimba tenant, autor e horário a partir
 * da SESSÃO — o chamador não escolhe nenhum dos três. Um log que a parte
 * auditada consegue forjar não serve para auditar ninguém.
 *
 * ┌─ NUNCA FALHA, E NUNCA É ESPERADA ──────────────────────────────────────┐
 * │ É chamada DEPOIS que a operação de verdade já foi gravada, e sem        │
 * │ `await` do lado de quem chama. Duas consequências deliberadas:          │
 * │                                                                        │
 * │  1. Erro aqui não derruba nada. Se o log estourasse, o app diria "não   │
 * │     foi possível registrar a venda" sobre uma venda que ESTÁ no banco — │
 * │     e mandaria o balconista cobrar de novo.                            │
 * │                                                                        │
 * │  2. A tela não espera por ela. O balcão não pode ficar mais lento por   │
 * │     causa de uma linha de histórico.                                    │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * A CHAVE É `entidade.verbo`, em inglês — as MESMAS que o portal grava
 * (`apps/portal-client/lib/historico.ts`). Os dois escrevem na mesma tabela e
 * são lidos pelas duas telas: uma venda feita no app precisa aparecer no
 * portal com o mesmo rótulo de uma feita no portal.
 */
export function logActivity(
  action: string,
  detail?: { entityId?: string | null; summary?: string | null; metadata?: unknown },
): void {
  void supabase
    .rpc('log_activity', {
      p_action: action,
      p_entity_id: detail?.entityId ?? null,
      p_summary: detail?.summary ?? null,
      p_metadata: detail?.metadata ?? null,
    })
    .then(
      () => undefined,
      () => undefined,
    );
}
