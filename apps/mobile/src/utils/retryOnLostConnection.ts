/**
 * Um `fetch` que tenta de novo, UMA vez, quando a conexão reaproveitada já
 * estava morta.
 *
 * ┌─ O ERRO ────────────────────────────────────────────────────────────────┐
 * │ "The network connection was lost" (NSURLErrorNetworkConnectionLost).   │
 * │ O `fetch` do Expo no iOS mantém conexões abertas para reaproveitar, e o │
 * │ servidor fecha as que ficam ociosas. Depois de um tempo parado — o      │
 * │ caso típico é esperar o e-mail com o código —, a próxima requisição vai │
 * │ por uma conexão que já não existe e morre na hora. O iOS repete sozinho │
 * │ só GET; POST ele devolve como erro, e o Supabase Auth é todo POST.      │
 * │ Aconteceu nos dois passos da recuperação de senha, um depois do outro.  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * QUEM é repetido é decidido por `podeRepetir`, e o critério é não duplicar
 * efeito: leitura sempre; escrita só onde repetir é inofensivo. Um POST de
 * venda ou de custo que tivesse chegado ao servidor antes da conexão cair
 * seria gravado duas vezes.
 *
 * Só ESTE erro é repetido. Sem rede de verdade, timeout ou resposta de erro do
 * servidor voltam como vieram: a segunda tentativa daria o mesmo resultado.
 */
export function retryOnLostConnection(
  fetchFn: typeof fetch,
  podeRepetir: (url: string, method: string) => boolean,
): typeof fetch {
  return async (input, init) => {
    try {
      return await fetchFn(input, init);
    } catch (e) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
      if (!conexaoPerdida(e) || !podeRepetir(url, method)) throw e;
      return fetchFn(input, init);
    }
  };
}

const conexaoPerdida = (e: unknown) =>
  /network connection was lost/i.test(e instanceof Error ? e.message : String(e ?? ''));
