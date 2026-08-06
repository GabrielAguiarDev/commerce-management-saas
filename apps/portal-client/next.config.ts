import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@aguiar/ui` é publicado como TypeScript, sem passo de build: o Next é quem
  // o compila junto com o app. É o que mantém a lib editável sem `pnpm build`
  // a cada mudança.
  transpilePackages: ["@aguiar/ui"],

  async headers() {
    return [
      {
        /**
         * O service worker é servido por uma rota estática, e o Next marca
         * estático como "guarde por um ano". Para o navegador isso não é
         * problema — ele sempre revalida o arquivo do worker —, mas uma CDN no
         * meio do caminho poderia continuar entregando o worker do deploy
         * anterior, e ele decide o que o portal inteiro vê offline. Aqui a
         * regra é a oposta: sempre pergunte se mudou.
         */
        source: "/serwist/sw.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

/**
 * `withSerwist` só declara o `esbuild` como pacote externo do servidor — a rota
 * que compila o service worker (`app/serwist/[path]/route.ts`) o carrega em
 * tempo de build, e empacotá-lo junto quebraria essa carga.
 */
export default withSerwist(nextConfig);
