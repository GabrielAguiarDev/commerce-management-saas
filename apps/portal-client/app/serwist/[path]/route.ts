import { createSerwistRoute } from "@serwist/turbopack";

/**
 * Onde o service worker é compilado e servido.
 *
 * O Next 16 monta o app com o Turbopack, que não tem plugins de webpack — o
 * caminho antigo (`withSerwist` gerando `public/sw.js` no build do webpack) não
 * existe mais. Aqui o `@serwist/turbopack` compila `app/sw.ts` com o esbuild e
 * o entrega por esta rota, que é `force-static`: a compilação acontece uma vez,
 * no build, e o resultado é um arquivo estático como qualquer outro.
 *
 * O endereço final é `/serwist/sw.js`, e é ele que o `SerwistProvider` registra
 * no `layout.tsx`. Um worker servido de uma subpasta só mandaria naquela
 * subpasta; a rota responde com `Service-Worker-Allowed: /` para que ele valha
 * no portal inteiro.
 *
 * IMPORTANTE: `proxy.ts` não pode interceptar `/serwist/*`. Sem sessão o
 * middleware devolveria o HTML do login no lugar do JS, e o registro falharia
 * com um erro de MIME type difícil de ligar à causa.
 */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "app/sw.ts",

  // O esbuild nativo, que já está instalado. Sem isto o Serwist procura o
  // `esbuild-wasm` (o padrão fora do Windows) e o build para dizendo que falta
  // um pacote.
  useNativeEsbuild: true,

  esbuildOptions: {
    // O `serwist` e a lista de caches padrão consultam `process.env.NODE_ENV`
    // para decidir o que fazer (em desenvolvimento, nada é guardado). Dentro de
    // um service worker não existe `process`, então o valor é fixado aqui, na
    // compilação — sem isto o worker morre na primeira linha.
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
    },
  },
});
