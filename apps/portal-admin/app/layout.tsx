import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Public_Sans } from "next/font/google";
import { AdminProvider } from "@/components/AdminProvider";
import { AdminShell } from "@/components/AdminShell";
import { listTickets } from "@/lib/chamados";
import { listCustomers } from "@/lib/clientes";
import { listSettings } from "@/lib/configuracoes";
import { listModules } from "@/lib/modulos";
import { listBilling } from "@/lib/pagamentos";
import { currentProfile } from "@/lib/perfil";
import { listPlans } from "@/lib/planosBanco";
import "./globals.css";

/**
 * As duas fontes dos portais. Os nomes das variáveis são os mesmos no portal do
 * cliente — é por eles que `@aguiar/ui/tokens.css` monta `--fonte-sans` e
 * `--fonte-mono`, sem precisar saber qual app a está carregando.
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

/**
 * A cor que o navegador pinta na própria barra, no celular.
 *
 * É o SECUNDÁRIO DA MARCA — o mesmo valor que o portal do cliente e o site
 * declaram, o mesmo do fundo do ícone e da barra lateral aqui do console. Ela
 * não muda com o tema: o tema é preferência de quem trabalha, a marca não.
 */
export const viewport: Viewport = {
  themeColor: "#020e18",
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
  //
  // Em paralelo: são consultas independentes, e encadeá-las com um `await`
  // atrás do outro somaria todos os tempos de ida e volta à espera de todo
  // render.
  //
  // `listarPlanos` fica de fora do bloco porque `listarModulos` DEPENDE dela:
  // "disponível em" é derivado de `plans.module_keys`. As duas leituras juntas
  // ainda são mais rápidas do que a cascata inteira em série.
  const { plans, error: plansError } = await listPlans();

  const [
    { customers, error },
    { tickets, error: ticketsError },
    { modules, error: modulesError },
    { payments, revenue, error: billingError },
    { settings, error: settingsError },
    perfil,
  ] = await Promise.all([
    listCustomers(),
    listTickets(),
    listModules(plans),
    listBilling(),
    listSettings(),
    currentProfile(),
  ]);

  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable} h-full`}>
      {/* `data-tema` is flipped client-side by the console; seeding it here
          keeps the server markup and the first client paint in agreement. */}
      <body data-theme="light">
        {/* The session lives above the router, so filters, drafts, theme and
            language survive moving between routes. */}
        <AdminProvider
          initialCustomers={customers}
          customersError={error}
          initialTickets={tickets}
          ticketsError={ticketsError}
          initialModules={modules}
          modulesError={modulesError}
          initialPlans={plans}
          plansError={plansError}
          initialPayments={payments}
          initialRevenue={revenue}
          billingError={billingError}
          initialSettings={settings}
          settingsError={settingsError}
          adminName={perfil?.name ?? perfil?.email ?? null}
        >
          <AdminShell>{children}</AdminShell>
        </AdminProvider>
      </body>
    </html>
  );
}
