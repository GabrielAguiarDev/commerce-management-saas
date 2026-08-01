import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { AdminProvider } from "@/components/AdminProvider";
import { AdminShell } from "@/components/AdminShell";
import { listarClientes } from "@/lib/clientes";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

/**
 * Nada aqui pode ser pré-renderizado e reaproveitado: a página carrega os
 * clientes da sessão de quem pediu. Sem isto, um build feito sem as variáveis
 * de ambiente congelaria uma lista vazia para todo mundo.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aguiar One · Console admin",
  description:
    "Console de administração do Aguiar One: clientes, módulos, planos, financeiro e suporte.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // A leitura acontece no SERVIDOR, com o cliente que carrega a sessão pelos
  // cookies — o RLS decide o que este usuário pode ver. Fica no layout, e não
  // em cada página, porque a lista alimenta quatro telas de uma vez (visão,
  // clientes, ficha e financeiro) e todas precisam concordar entre si.
  const { clientes, erro } = await listarClientes();

  return (
    <html
      lang="pt-BR"
      className={`${plexSans.variable} ${plexMono.variable} h-full`}
    >
      {/* `data-tema` is flipped client-side by the console; seeding it here
          keeps the server markup and the first client paint in agreement. */}
      <body data-tema="claro">
        {/* The session lives above the router, so filters, drafts, theme and
            language survive moving between routes. */}
        <AdminProvider clientesIniciais={clientes} erroClientes={erro}>
          <AdminShell>{children}</AdminShell>
        </AdminProvider>
      </body>
    </html>
  );
}
