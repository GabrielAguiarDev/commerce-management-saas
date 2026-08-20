import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@aguiar/ui` é publicado como TypeScript, sem passo de build: o Next é quem
  // o compila junto com o app. É o que mantém a lib editável sem `pnpm build`
  // a cada mudança. `@aguiar/brand` entra pelo mesmo motivo — é TS puro, e a
  // lib o importa —, e sem ele na lista o build quebra no `import` da marca.
  transpilePackages: ["@aguiar/ui", "@aguiar/brand"],

  experimental: {
    /**
     * Por quanto tempo o Router Cache do navegador pode reaproveitar uma tela
     * já visitada, em segundos.
     *
     * O padrão do Next 16 é `dynamic: 0` — e como o layout raiz é
     * `force-dynamic`, toda rota deste portal é dinâmica. Zero significa que
     * voltar para uma tela vista há dois segundos custa uma ida ao servidor
     * inteira, com o `proxy.ts` renovando a sessão no caminho (medido: ~350ms
     * dos ~400ms de cada navegação). Quem está no balcão vê o esqueleto de novo,
     * e o portal parece lento sem estar buscando nada de novo.
     *
     * 15s, e não os 30s do exemplo da documentação, porque dois aparelhos no
     * mesmo balcão — dono e funcionário — é cenário real aqui: é o teto de
     * quanto tempo uma venda lançada no outro celular pode demorar a aparecer
     * numa tela que ESTE aparelho já tinha aberto.
     *
     * O que este número NÃO atrasa: mudança feita neste aparelho. Toda Server
     * Action chama `revalidatePath("/", "layout")`, que descarta este cache
     * inteiro — a tela seguinte já vem do servidor.
     *
     * `static` fica de fora de propósito: o padrão (300s) só vale para rotas
     * estáticas, e o `force-dynamic` do layout garante que não existe nenhuma.
     */
    staleTimes: { dynamic: 15 },
  },

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
