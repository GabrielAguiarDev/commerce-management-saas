/// <reference lib="webworker" />

import { defaultCache } from "@serwist/turbopack/worker";
import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

/**
 * O service worker do portal — o que faz as telas abrirem sem internet.
 *
 * Ele NÃO é empacotado pelo Next: quem o compila é o `esbuild` chamado por
 * `app/serwist/[path]/route.ts`, que serve o resultado em `/serwist/sw.js`. Por
 * isso este arquivo não pode importar nada do app (nem `@/lib/...`): ele roda
 * fora da página, num contexto sem `window` e sem React.
 *
 * O QUE ESTA FASE ENTREGA: abrir o app e navegar pelas telas sem rede, com o
 * último retrato que o servidor mandou. O que grava no banco — registrar venda,
 * fechar caixa — continua falhando offline, de propósito. A fila de escrita é
 * a fase 2.
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    /**
     * A lista de arquivos a guardar na instalação, injetada na compilação: o
     * `.next/static` inteiro (JS e CSS de cada tela) mais o `public/` — ícones e
     * a página de fallback.
     */
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * A página servida quando a pessoa, offline, pede uma tela que nunca abriu — o
 * único caso em que não há nada em cache para mostrar. É um HTML solto em
 * `public/`, sem React e sem dados do negócio, justamente porque precisa
 * funcionar quando nada mais funciona.
 */
const OFFLINE_URL = "/offline.html";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,

  // Versão nova assume assim que chega, sem esperar todas as abas fecharem.
  // Combina com o Next, cujos arquivos levam o hash do conteúdo no nome: manter
  // o worker velho servindo um HTML novo é que daria tela quebrada.
  skipWaiting: true,
  clientsClaim: true,

  // O navegador começa a buscar a página em paralelo com a partida do worker,
  // em vez de depois dela. É o que evita o atraso que um service worker
  // costuma somar à primeira navegação.
  navigationPreload: true,

  runtimeCaching: [
    /**
     * O Supabase fica FORA do cache, sempre.
     *
     * Duas razões: uma resposta guardada com o token de uma sessão pode ser
     * devolvida a outra, e nesta fase é melhor a leitura falhar na cara do que
     * o portal exibir um saldo de ontem como se fosse o de agora. Quando a fase
     * 2 chegar, quem guarda dados é o banco local — não este cache.
     */
    {
      matcher: ({ url }) => url.hostname.endsWith(".supabase.co"),
      handler: new NetworkOnly(),
    },

    /**
     * O resto é a receita do Serwist para Next, e ela já separa o que precisa
     * ser separado:
     *   - `_next/static` (JS, CSS, fontes): cache primeiro, porque o nome tem o
     *     hash do conteúdo — mudou o arquivo, mudou a URL;
     *   - páginas e payloads do roteador: REDE PRIMEIRO, caindo no cache só
     *     quando a rede não responde. É o que mantém o portal sempre com o dado
     *     de agora quando há internet, e ainda assim abrindo sem ela;
     *   - imagens e ícones: serve o guardado e revalida por trás.
     *
     * Fora de produção a lista inteira vira "só rede" — o cache atrapalharia o
     * `next dev`.
     */
    ...defaultCache,
  ],

  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        // Só para navegação. Um JS ou uma imagem que falta não pode receber
        // HTML como resposta — isso trocaria um erro claro por um estranho.
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
