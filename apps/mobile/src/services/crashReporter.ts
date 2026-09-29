/**
 * O PONTO ÚNICO por onde um erro inesperado sai do aparelho.
 *
 * Hoje não sai: sem crash reporting configurado, em desenvolvimento o erro vai
 * para o console e em produção é descartado. Quando o Sentry entrar, a ligação
 * é uma linha na inicialização — `setCrashSink(Sentry.captureException)` — e
 * nenhum ponto de captura precisa mudar.
 *
 * Quem chama daqui: o `ErrorBoundary` das rotas. Erro ESPERADO (rede, RLS,
 * validação) não passa por aqui — esses já viram mensagem na tela pelos
 * adapters; mandá-los para o reporter afogaria os crashes de verdade.
 */

export interface CrashContext {
  /** Onde o erro foi pego, ex.: `'route:(app)'`. */
  where: string;
  extra?: Record<string, unknown>;
}

export type CrashSink = (error: unknown, context: CrashContext) => void;

const devSink: CrashSink = (error, context) => {
  console.error(`[crash] ${context.where}`, error, context.extra ?? '');
};

const noopSink: CrashSink = () => {};

let sink: CrashSink = typeof __DEV__ !== 'undefined' && __DEV__ ? devSink : noopSink;

export function setCrashSink(next: CrashSink): void {
  sink = next;
}

/** Nunca lança: falhar ao reportar um erro não pode virar um segundo erro. */
export function reportCrash(error: unknown, context: CrashContext): void {
  try {
    sink(error, context);
  } catch {
    // O reporter caiu junto — não há a quem avisar.
  }
}
