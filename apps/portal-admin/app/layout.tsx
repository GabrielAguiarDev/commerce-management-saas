import { BRAND } from "@aguiar/ui";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope, Public_Sans } from "next/font/google";
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
 * A fonte do SITE, carregada aqui só por causa de uma tela.
 *
 * O console não a usa em lugar nenhum da própria interface — quem manda nela é
 * `Public_Sans`. A Manrope existe neste layout para que a prévia da tela de
 * Vitrine (`components/VitrinePreviewCard.tsx`) desenhe o card de plano com a
 * mesma letra que a landing page usa. Sem ela, o "R$ 89" da prévia sairia em
 * Public Sans: mesmo tamanho, mesmo peso, outro desenho — e uma prévia que
 * erra a tipografia do elemento mais visível do card não está fazendo o
 * trabalho para o qual foi feita.
 *
 * DOIS PESOS SÓ, e não a família inteira: 800 para o preço, 700 para o botão e
 * para o selo "Recomendado". É tudo que aquele card desenha.
 */
const display = Manrope({
  variable: "--font-display",
  weight: ["700", "800"],
  subsets: ["latin"],
  display: "swap",
  // `preload: false` porque ela serve a UMA tela — e, dentro dela, só quando o
  // formulário de um cartão está aberto. As outras fontes são precarregadas
  // porque toda página do console as desenha na primeira pintura; esta não, e
  // um `<link rel="preload">` em todas as telas gastaria banda de quem nunca
  // vai abrir a Vitrine. Sem o preload, o navegador a busca quando encontrar o
  // primeiro texto que a usa, e o `swap` cobre esse instante.
  preload: false,
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
  themeColor: BRAND.ink,
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
  // `listarPlanos` entra no bloco como PROMESSA, e não esperada antes dele.
  // `listarModulos` depende dela — "disponível em" é derivado de
  // `plans.module_keys` —, mas só no cruzamento do fim: a consulta a `modules`
  // não precisa de nada. Passando a promessa adiante, essa espera acontece lá
  // dentro e as duas leituras viajam junto com as outras cinco, em vez de o
  // render inteiro começar por uma ida e volta sozinha.
  const plansPromise = listPlans();

  const [
    { customers, error },
    { tickets, error: ticketsError },
    { modules, error: modulesError },
    { payments, revenue, error: billingError },
    { settings, error: settingsError },
    perfil,
    { plans, error: plansError },
  ] = await Promise.all([
    listCustomers(),
    listTickets(),
    listModules(plansPromise.then((r) => r.plans)),
    listBilling(),
    listSettings(),
    currentProfile(),
    plansPromise,
  ]);

  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable} ${display.variable} h-full`}>
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
