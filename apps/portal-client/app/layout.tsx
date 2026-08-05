import type { Metadata } from "next";
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
        {/* A sessão vive acima do roteador, então filtros, carrinho, rascunhos
            e aparência sobrevivem à troca de tela. */}
        <PortalProvider data={data}>
          <PortalShell>{children}</PortalShell>
        </PortalProvider>
      </body>
    </html>
  );
}
