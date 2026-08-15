import { BRAND } from "@aguiar/ui";
import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Public_Sans } from "next/font/google";
import { PortalProvider } from "@/components/PortalProvider";
import { PortalShell } from "@/components/PortalShell";
import { loadPortal } from "@/lib/dados/carregar";
import "./globals.css";

/**
 * As duas fontes dos portais. Os nomes das variáveis são os mesmos no painel —
 * é por eles que `@aguiar/ui/tokens.css` monta `--fonte-sans` e `--fonte-mono`,
 * sem precisar saber qual app a está carregando.
 */
const sans = Public_Sans({
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aguiar One · Portal do Cliente",
  description:
    "O portal do seu negócio: vendas, caixa, produtos, estoque, custos, relatórios e suporte.",

  // O nome que o sistema mostra embaixo do ícone instalado.
  applicationName: "Aguiar One",

  /**
   * O iOS ignora o manifesto: para ele, "adicionar à tela de início" abrir sem
   * a barra do Safari depende destas marcações. O ícone também é outro — o
   * `apple-touch-icon` é quadrado e opaco, porque o próprio iOS arredonda.
   */
  appleWebApp: {
    capable: true,
    title: "Aguiar One",
    statusBarStyle: "default",
  },

  /**
   * O ícone da ABA não entra aqui: quem o serve é o `app/favicon.ico`, pela
   * convenção de arquivo do Next.
   *
   * É o MESMO ARQUIVO do `portal-admin`, byte a byte, e de FUNDO BRANCO: os
   * dois apps ficam lado a lado na barra de abas de quem administra a
   * plataforma, e ali eles precisam se parecer. O branco é opaco de propósito —
   * transparente, o "A" azul mudava de aparência conforme o tema do navegador,
   * e as duas abas nunca ficavam iguais.
   *
   * Os ladrilhos opacos (`/icons/icon-*.png`) continuam valendo onde o sistema
   * pede um ícone quadrado e cheio, e só lá: o manifesto os declara para o app
   * instalado, e o `apple-touch-icon` faz esse papel no iOS. Eles seguem em
   * petrol, que é o que emenda com o `theme_color` da barra do sistema — trocar
   * o fundo deles por branco mudaria o ícone na tela de início do celular.
   */
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },

  // O `<link rel="manifest">` não entra aqui: o Next o injeta sozinho por
  // existir o `app/manifest.ts`.
};

/**
 * A cor que o sistema pinta em volta do app instalado — barra de status no
 * celular, barra de título na janela do desktop.
 *
 * É o SECUNDÁRIO DA MARCA nos dois temas, e de propósito: esta é a moldura que
 * encosta no ícone do portal na tela de início, e o ícone tem esse mesmo petrol
 * de fundo. Uma moldura que mudasse com o tema descolaria do ícone, que não
 * muda. O valor é o mesmo do `theme_color` do manifesto — quem lê cada um deles
 * é um sistema diferente, e os dois precisam dizer a mesma coisa.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: BRAND.ink,
};

/**
 * Nada aqui pode ser pré-renderizado e reaproveitado: a página carrega os dados
 * do negócio de quem pediu. Sem isto, um build feito sem as variáveis de
 * ambiente congelaria um portal vazio para todo mundo.
 */
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // A leitura acontece no SERVIDOR, com o cliente que carrega a sessão pelos
  // cookies — o RLS decide o que este usuário pode ver. Uma vez por navegação,
  // aqui, porque o menu e todas as telas leem do mesmo retrato.
  const data = await loadPortal();

  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable} h-full`}>
      {/* `data-tema` é trocado no cliente pelo portal; semeá-lo aqui mantém a
          marcação do servidor e a primeira pintura do cliente de acordo. */}
      <body data-theme="light">
        {/*
          Registra o service worker que guarda as telas — é ele que faz o portal
          abrir sem internet. Ver `app/sw.ts` e `app/serwist/[path]/route.ts`.

          `disable` em desenvolvimento: um worker guardando telas no meio do
          `next dev` devolve a versão de dez minutos atrás e transforma qualquer
          depuração em caça-fantasma. Ele existe só no build de produção.

          `reloadOnOnline={false}`: o padrão do Serwist recarrega a página assim
          que a internet volta, e aqui isso apagaria o carrinho de uma venda em
          andamento — ele vive na memória do `PortalProvider`. Quem avisa que a
          conexão caiu é a tarja do `AvisoOffline`; recarregar é escolha da
          pessoa.
        */}
        <SerwistProvider
          swUrl="/serwist/sw.js"
          disable={process.env.NODE_ENV !== "production"}
          reloadOnOnline={false}
        >
          {/* A sessão vive acima do roteador, então filtros, carrinho, rascunhos
              e aparência sobrevivem à troca de tela. */}
          <PortalProvider data={data}>
            <PortalShell>{children}</PortalShell>
          </PortalProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
