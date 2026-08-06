/**
 * Os caches de TELAS que o service worker mantém — os que guardam HTML e os
 * payloads do roteador, ou seja, os que contêm dados do negócio.
 *
 * Os nomes são os que o `defaultCache` do Serwist usa (`PAGES_CACHE_NAME` em
 * `@serwist/turbopack/worker`). Estão escritos à mão de propósito: importar
 * aquele módulo aqui arrastaria a biblioteca inteira do worker para dentro do
 * pacote que o navegador baixa, por causa de três strings.
 *
 * Ficam de fora os caches de arquivo estático (`next-static-js-assets` e
 * companhia): são o mesmo JS para todo mundo, não têm dado de ninguém, e apagá-
 * los só faria a próxima pessoa esperar o download de novo.
 */
const CACHES_COM_DADOS = ["pages", "pages-rsc", "pages-rsc-prefetch", "others"];

/**
 * Apaga as telas guardadas.
 *
 * Chamado ao sair: o portal roda no computador do balcão, e sem isto quem
 * ficasse sozinho na loja poderia desligar a internet, abrir o app e ler o
 * faturamento do dia na cópia que sobrou em cache — a sessão já teria acabado, o
 * cache não.
 *
 * Nunca impede a saída: se o navegador não tiver a API de cache, ou se a
 * limpeza falhar, a promessa se resolve assim mesmo e o `signOut` segue.
 */
export async function limparTelasGuardadas(): Promise<void> {
  if (typeof caches === "undefined") return;

  try {
    await Promise.all(CACHES_COM_DADOS.map((nome) => caches.delete(nome)));
  } catch {
    // Sair é mais importante do que limpar. O pior caso é o cache velho ficar
    // para trás — e ele é substituído na primeira navegação do próximo login.
  }
}
