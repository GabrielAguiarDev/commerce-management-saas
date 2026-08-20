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
     * `force-dynamic`, toda rota deste console é dinâmica. Zero significa que
     * voltar para uma tela vista há dois segundos custa uma ida ao servidor
     * inteira, com o `proxy.ts` renovando a sessão no caminho; foi medido no
     * portal do cliente, de arquitetura idêntica, e o middleware sozinho
     * respondia por 85 a 95% dos ~400ms de cada navegação. O esqueleto reaparece
     * sem que nada novo esteja sendo buscado.
     *
     * O MESMO VALOR DO PORTAL DO CLIENTE, de propósito: um número só para os
     * dois apps é mais fácil de lembrar do que dois quase iguais. Aqui daria
     * para folgar mais — o console é de uma pessoa só, sem o cenário de dois
     * aparelhos mexendo no mesmo dado —, e 30s seria defensável; o ganho a mais
     * é pequeno e não paga a divergência.
     *
     * O que este número NÃO atrasa: mudança feita neste console. Toda Server
     * Action chama `revalidatePath("/", "layout")`, que descarta este cache
     * inteiro — a tela seguinte já vem do servidor. O que pode chegar até 15s
     * atrasado é o que mudou do lado do CLIENTE (um chamado novo no suporte,
     * por exemplo) numa tela que este navegador já tinha aberto.
     *
     * `static` fica de fora: o padrão (300s) só vale para rotas estáticas, e o
     * `force-dynamic` do layout garante que não existe nenhuma.
     */
    staleTimes: { dynamic: 15 },
  },
};

export default nextConfig;
