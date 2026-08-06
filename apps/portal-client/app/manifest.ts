import type { MetadataRoute } from "next";

/**
 * O manifesto do aplicativo — é ele que torna o portal INSTALÁVEL.
 *
 * Com este arquivo o Next serve `/manifest.webmanifest` e injeta o
 * `<link rel="manifest">` em todas as páginas sozinho; não há nada a acrescentar
 * no `layout.tsx` por causa dele.
 *
 * O navegador só oferece a instalação quando encontra, juntos: o manifesto com
 * `name`, `icons` de 192 e 512, `start_url` e `display`; um service worker
 * registrado (ver `app/sw.ts`); e HTTPS. Faltando um, o botão "Instalar" não
 * aparece e o Chrome não diz o porquê — daí o cuidado com cada campo abaixo.
 */

/**
 * O layout raiz é `force-dynamic` porque toda tela lê o negócio de quem pediu.
 * O manifesto não: ele é o mesmo para todo mundo, e sem esta linha herdaria a
 * configuração do segmento e seria remontado a cada requisição à toa.
 */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // `id` é a identidade do app para o navegador. Fixá-lo permite mudar a
    // `start_url` um dia sem que o sistema trate o portal como um app novo
    // (o que criaria um segundo ícone ao lado do que a pessoa já instalou).
    id: "/",
    name: "Aguiar One",
    short_name: "Aguiar One",
    description:
      "O portal do seu negócio: vendas, caixa, produtos, estoque, custos, relatórios e suporte.",
    lang: "pt-BR",
    dir: "ltr",

    // Aberto pelo ícone, o app cai no painel. Quem ainda não entrou é levado ao
    // login pelo `proxy.ts`, como em qualquer outra rota.
    start_url: "/",

    // Tudo dentro de `/` é "o app": navegar entre as telas não abre o navegador
    // por fora da janela instalada.
    scope: "/",

    // Sem barra de endereço nem abas — a janela do portal tem cara de programa
    // instalado, que é o ponto de instalar.
    display: "standalone",

    // A cor da tela enquanto o app abre, antes de a primeira pintura chegar.
    // É o `--bg` do tema claro: a espera tem a cor do portal, não branco puro.
    background_color: "#eaeef2",

    // A cor que o sistema pinta em volta da janela (barra de status no Android,
    // barra de título no desktop). O petróleo escuro do menu lateral, que é a
    // borda mais escura do portal em qualquer tema.
    theme_color: "#0f1c22",

    orientation: "any",
    categories: ["business", "finance", "productivity"],

    icons: [
      // `any`: o ícone como ele é, com o canto arredondado desenhado por nós.
      // Serve o desktop, a aba e o instalador.
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },

      // `maskable`: o Android recorta o ícone na forma do sistema (círculo,
      // gota, quadrado). Estes trazem a marca menor, dentro da área segura, e
      // fundo até a borda — sem eles o "A" sai cortado nos aparelhos que
      // recortam em círculo.
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],

    // Atalhos do menu de contexto do ícone (clique direito no desktop, toque
    // longo no Android): as duas coisas que o dono faz todo dia.
    shortcuts: [
      {
        name: "Nova venda",
        short_name: "Vender",
        url: "/vendas/nova",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Caixa",
        short_name: "Caixa",
        url: "/caixa",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
