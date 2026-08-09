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
 * A cor da barra do navegador no celular acompanha a primeira dobra, que é
 * escura — sem isto ela fica branca e aparece um corte no alto da tela.
 */
export const viewport: Viewport = {
  themeColor: "#12323c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable}`}>
      {/* `overflow-x:hidden` porque as sombras largas das dobras escuras
          empurram alguns pixels para fora da viewport no celular. */}
      <body style={{ overflowX: "hidden" }}>{children}</body>
    </html>
  );
}
