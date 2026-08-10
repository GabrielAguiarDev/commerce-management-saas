"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { Modal } from "@/components/Modal";
import { Hint, NavScrim, Toasts } from "@/components/Overlays";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { css } from "@aguiar/ui";
import { currentMonth } from "@/lib/datas";
import { computeMrr, billable, formatMrr } from "@/lib/money";
import { customerIdFromRoute, ROUTES } from "@/lib/rotas";
import { customerById } from "@/lib/state";

/**
 * The chrome every screen shares: rail, header, and the overlays that can
 * appear from anywhere. The page rendered by the router goes in as `children`.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { s, a, cs, empty, isMobile } = useAdmin();
  const { L } = a;
  const pathname = usePathname();

  // Toasts, tooltips and the confirmation dialog can be raised from any screen,
  // sign-in included.
  const overrides = (
    <>
      <Toasts toasts={s.toasts} />
      {s.hint && <Hint hint={s.hint} />}
      {s.modal && <Modal />}
    </>
  );

  // Sign-in owns the whole viewport — no rail, no header.
  if (pathname === ROUTES.login) {
    return (
      <>
        {children}
        {overrides}
      </>
    );
  }

  const open = (empty ? [] : s.tickets).filter((t) => t.status === "open").length;

  // "Resumo da operação do Aguiar One em agosto de 2026" — o mês vem do
  // relógio, não de um texto fixo do protótipo.
  const overviewSubtitle = `${L.tituloVisao[1]} ${currentMonth(s.language)}`;

  const titles: Record<string, [string, string]> = {
    [ROUTES.overview]: [L.tituloVisao[0], overviewSubtitle],
    [ROUTES.customers]: [L.tituloClientes[0], L.tituloClientes[1]],
    [ROUTES.support]: [L.tituloSuporte[0], L.tituloSuporte[1]],
    [ROUTES.plans]: [L.tituloPlanos[0], L.tituloPlanos[1]],
    [ROUTES.modules]: [L.tituloModulos[0], L.tituloModulos[1]],
    [ROUTES.settings]: [L.tituloConfig[0], L.tituloConfig[1]],
    [ROUTES.financeiro]: [L.tituloFinanceiro[0], L.tituloFinanceiro[1]],
  };

  // /clientes/novo tem cabeçalho próprio; o segmento "novo" não é um id.
  if (pathname === ROUTES.novoCliente) {
    titles[pathname] = [
      s.language === "pt" ? "Novo cliente" : "New customer",
      s.language === "pt"
        ? "Cadastre um novo comércio na plataforma"
        : "Register a new business on the platform",
    ];
  }

  // A customer record is titled with the business it belongs to.
  const customerId = customerIdFromRoute(pathname);
  const customer = customerId != null ? customerById(s, customerId) : undefined;
  const [title, subtitle] = customer
    ? [customer.name, L.tituloDetalhe]
    : (titles[pathname] ?? [L.tituloVisao[0], overviewSubtitle]);

  /**
   * Telas de altura travada: a janela não rola, e a área de conteúdo entrega
   * exatamente o espaço que sobra entre a barra de topo e a base — quem rola é
   * cada painel, por dentro.
   *
   * É exceção, não regra: as outras telas são listas que crescem e devem rolar
   * na página, do jeito que já faziam. Por isso o modo é escolhido pela rota em
   * vez de virar o padrão da casca.
   */
  const fixedHeight = pathname === ROUTES.support;

  return (
    <div
      style={css(
        // Sem `overflow-x:hidden` aqui, de propósito. A gaveta fechada é um
        // elemento `fixed` empurrado para a ESQUERDA da origem, e o que sai por
        // esse lado não gera barra de rolagem nenhuma. Recortar mesmo assim
        // sairia caro: um `overflow` não-visível faz deste `div` o container de
        // rolagem dos `position:sticky` de dentro, e como ele cresce com o
        // conteúdo em vez de rolar, a barra de topo deixaria de grudar.
        "display:flex;align-items:stretch;background:var(--bg);color:var(--text);" +
          // `overflow:hidden` impede que um painel alto empurre a barra de
          // rolagem da janela de volta.
          (fixedHeight ? "height:100vh;overflow:hidden" : "min-height:100vh"),
      )}
    >
      <Sidebar
        customerCount={cs.length}
        chamadosAbertos={open}
        mrrValor={formatMrr(computeMrr(cs))}
        // Antes era "+R$ 89 vs junho", um delta inventado. Não há série
        // histórica de MRR no banco, então o rodapé diz o que dá para provar:
        // quantos clientes sustentam o valor mostrado.
        mrrDelta={
          empty || billable(cs).length === 0
            ? s.language === "pt"
              ? "sem cobranças ativas"
              : "no active billing"
            : `${billable(cs).length} ${L.clientesCobraveis}`
        }
      />

      <main
        style={css(
          "flex:1;min-width:0;display:flex;flex-direction:column;" +
            // `min-height:0` é o que permite ao filho encolher abaixo do próprio
            // conteúdo; sem isso um item flex nunca gera scroll interno.
            (fixedHeight ? "min-height:0;overflow:hidden" : ""),
        )}
      >
        <Topbar title={title} subtitle={subtitle} />
        <div
          // A margem do conteúdo encolhe no celular: 30px de cada lado numa
          // tela de 360 são um sexto da largura útil gasto em nada.
          style={css(
            "display:flex;flex-direction:column;gap:" +
              (isMobile ? "14px;" : "20px;") +
              (fixedHeight
                ? "flex:1;min-height:0;overflow:hidden;padding:" +
                  (isMobile ? "14px" : "24px 30px")
                : "padding:" + (isMobile ? "14px 14px 32px" : "24px 30px 44px")),
          )}
        >
          {children}
        </div>
      </main>

      <NavScrim />
      {overrides}
    </div>
  );
}
