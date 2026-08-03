import type { Metadata } from "next";
import { IBM_Plex_Mono, Public_Sans } from "next/font/google";
import { PortalProvider } from "@/components/PortalProvider";
import { PortalShell } from "@/components/PortalShell";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aguiar One · Portal do Cliente",
  description:
    "O portal do seu negócio: vendas, caixa, produtos, estoque, custos, relatórios e suporte.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${publicSans.variable} ${plexMono.variable} h-full`}>
      {/* `data-tema` é trocado no cliente pelo portal; semeá-lo aqui mantém a
          marcação do servidor e a primeira pintura do cliente de acordo. */}
      <body data-tema="claro">
        {/* A sessão vive acima do roteador, então filtros, carrinho, rascunhos
            e aparência sobrevivem à troca de tela. */}
        <PortalProvider>
          <PortalShell>{children}</PortalShell>
        </PortalProvider>
      </body>
    </html>
  );
}
