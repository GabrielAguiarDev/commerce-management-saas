import "server-only";

/**
 * Avisa a landing page que a vitrine mudou.
 *
 * A landing é estática: ela lê `plan_showcase_public` uma vez, no build, e
 * serve HTML pronto. Sem este aviso, uma edição no console só apareceria no
 * próximo deploy — ou na virada do `revalidate` por tempo, que existe como
 * rede de segurança e não como caminho principal.
 *
 * ┌─ ESTA FUNÇÃO NÃO FALHA. NUNCA. ────────────────────────────────────────┐
 * │ Ela não lança, não devolve erro e não tem por que ser esperada com     │
 * │ `try` do lado de fora. É deliberado: a gravação no banco já aconteceu  │
 * │ quando ela roda, e o dado está salvo. Se a landing estiver fora do ar, │
 * │ se a variável não estiver configurada, se a rede cair — o admin não    │
 * │ pode ver "não foi possível salvar" por causa de um cache que não       │
 * │ limpou. Ele salvou. O site é que vai demorar mais para concordar.      │
 * │                                                                        │
 * │ O que sobra é o log, e é ele que conta a história quando alguém        │
 * │ perguntar por que o site ainda mostra o preço antigo.                  │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * CONFIGURAÇÃO (as duas, ou ela não faz nada e avisa no log):
 *   LANDING_REVALIDATE_URL   https://aguiarone.com/api/revalidate
 *   REVALIDATE_SECRET        o mesmo segredo declarado na landing
 */
export async function revalidarLanding(): Promise<void> {
  const url = process.env.LANDING_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!url || !secret) {
    console.warn(
      "[revalidarLanding] LANDING_REVALIDATE_URL ou REVALIDATE_SECRET ausente — " +
        "a vitrine foi salva, mas o site só vai refletir na próxima revalidação por tempo.",
    );
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      // O segredo vai no CABEÇALHO, não na query: URL entra em log de
      // servidor, de proxy e de navegador; cabeçalho, não.
      headers: { "x-revalidate-secret": secret },
      // Sem cache: é um comando, não uma leitura.
      cache: "no-store",
      // Teto curto. Quem espera é o admin, olhando um botão girando, e o
      // resultado desta chamada não muda nada do que ele acabou de fazer.
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      console.error(`[revalidarLanding] a landing recusou: HTTP ${res.status}`);
    }
  } catch (e) {
    // `AbortSignal.timeout` cai aqui como `TimeoutError`, junto com DNS,
    // recusa de conexão e TLS. Todos têm o mesmo desfecho: não é problema
    // de quem salvou.
    console.error("[revalidarLanding] falha ao avisar a landing:", (e as Error).message);
  }
}
