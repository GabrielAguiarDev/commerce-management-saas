import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Manrope } from "next/font/google";
import { COPY } from "@/lib/dictionary";
import "./globals.css";

/**
 * As duas fontes do site.
 *
 * NÃO são as dos portais (Public Sans + IBM Plex Mono). Aqui não há tabela nem
 * coluna de número para alinhar; há manchete, e o que a Manrope traz é o
 * aperto que uma manchete de vitrine precisa. Os nomes das variáveis seguem a
 * convenção do monorepo — `--font-sans` para o texto, e `--font-display` para o
 * par que só este app tem —, e `globals.css` monta as pilhas a partir delas.
 *
 * `next/font` hospeda os arquivos junto com a página: sem `preconnect` ao
 * Google, sem terceira parte no caminho crítico e sem o pisca de texto que o
 * `<link>` do arquivo de design produzia.
 */
const display = Manrope({
  variable: "--font-display",
  weight: ["600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

const sans = IBM_Plex_Sans({
  variable: "--font-sans",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: COPY.meta.title,
  description: COPY.meta.description,
  openGraph: {
    title: COPY.meta.title,
    description: COPY.meta.description,
    siteName: COPY.brand,
    locale: "pt_BR",
    type: "website",
  },
};

/**
 * A cor da barra do navegador no celular.
 *
 * É o SECUNDÁRIO DA MARCA — o mesmo valor que o portal declara no manifesto e
 * que o app pinta no splash e no fundo do ícone. Ela não tenta casar com o
 * topo da página (o cabeçalho é claro): a barra do sistema é a primeira cor do
 * produto que a pessoa vê, antes de qualquer pixel, e ela é a mesma no site, no
 * portal e no celular.
 */
export const viewport: Viewport = {
  themeColor: "#020e18",
};

/**
 * A trava da revelação, e o fusível dela.
 *
 * Roda no `<head>`, antes do primeiro pixel: põe `js-reveal` no `<html>` e é
 * essa classe que autoriza o CSS a esconder o que vai ser revelado. Sem ela
 * — JavaScript desligado, pacote que não chegou — o conteúdo simplesmente
 * aparece, porque o HTML do servidor já vem no estado final.
 *
 * O FUSÍVEL é a segunda metade. `<noscript>` cobre quem desligou o JavaScript,
 * mas não cobre o caso que realmente acontece no 4G instável: o script existe,
 * a trava entra, e o pacote que faria a revelação nunca termina de baixar. Aí o
 * conteúdo ficaria invisível para sempre. Dois segundos sem `__revealReady` —
 * a bandeira que `<Reveal>` levanta ao hidratar — e a trava cai sozinha.
 *
 * Fica escrito à mão, em uma linha, porque `<Script>` do Next agenda a execução
 * e esta precisa acontecer ANTES da pintura; qualquer atraso é o flash do
 * conteúdo aparecendo para depois sumir.
 */
const REVEAL_GATE =
  '(function(){var e=document.documentElement;e.classList.add("js-reveal");' +
  'setTimeout(function(){window.__revealReady||e.classList.remove("js-reveal")},2000)})()';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    /**
     * `suppressHydrationWarning` porque o script acima é o ÚNICO jeito de a
     * trava chegar antes da pintura, e chegar antes da pintura significa
     * chegar antes da hidratação: quando o React confere o `<html>`, o
     * `className` do DOM já tem um `js-reveal` que o HTML do servidor não
     * tinha, e ele reclama da diferença.
     *
     * O aviso NÃO vale para a árvore inteira — ele para neste elemento e não
     * desce para os filhos, então tudo que está dentro continua sendo
     * conferido normalmente. O ponto cego é só o `<html>`, cujos atributos
     * aqui são dois e ambos fixos: `lang` e as duas variáveis de fonte.
     *
     * É a mesma solução que qualquer troca de tema sem piscar usa, e pelo
     * mesmo motivo.
     */
    <html
      lang="pt-BR"
      className={`${display.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: REVEAL_GATE }} />
      </head>
      {/* `overflow-x:hidden` porque as sombras largas das dobras escuras
          empurram alguns pixels para fora da viewport no celular. */}
      <body style={{ overflowX: "hidden" }}>{children}</body>
    </html>
  );
}
