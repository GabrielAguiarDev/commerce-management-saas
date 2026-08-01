"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { Modal } from "@/components/Modal";
import { Dica, Toasts } from "@/components/Overlays";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { css } from "@/lib/css";
import { calcMrr, fmtMrr } from "@/lib/money";
import { clienteIdDaRota, ROTAS } from "@/lib/rotas";
import { clientePorId } from "@/lib/state";

/**
 * The chrome every screen shares: rail, header, and the overlays that can
 * appear from anywhere. The page rendered by the router goes in as `children`.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { s, a, cs, vazio } = useAdmin();
  const { L } = a;
  const pathname = usePathname();

  // Toasts, tooltips and the confirmation dialog can be raised from any screen,
  // sign-in included.
  const sobreposicoes = (
    <>
      <Toasts toasts={s.toasts} />
      {s.dica && <Dica dica={s.dica} />}
      {s.modal && <Modal />}
    </>
  );

  // Sign-in owns the whole viewport — no rail, no header.
  if (pathname === ROTAS.login) {
    return (
      <>
        {children}
        {sobreposicoes}
      </>
    );
  }

  const abertos = (vazio ? [] : s.chamados).filter((t) => t.status === "aberto").length;

  const titulos: Record<string, [string, string]> = {
    [ROTAS.visao]: [L.tituloVisao[0], L.tituloVisao[1]],
    [ROTAS.clientes]: [L.tituloClientes[0], L.tituloClientes[1]],
    [ROTAS.suporte]: [L.tituloSuporte[0], L.tituloSuporte[1]],
    [ROTAS.planos]: [L.tituloPlanos[0], L.tituloPlanos[1]],
    [ROTAS.modulos]: [L.tituloModulos[0], L.tituloModulos[1]],
    [ROTAS.config]: [L.tituloConfig[0], L.tituloConfig[1]],
    [ROTAS.financeiro]: [L.tituloFinanceiro[0], L.tituloFinanceiro[1]],
  };

  // A customer record is titled with the business it belongs to.
  const clienteId = clienteIdDaRota(pathname);
  const cliente = clienteId != null ? clientePorId(s, clienteId) : undefined;
  const [titulo, subtitulo] = cliente
    ? [cliente.nome, L.tituloDetalhe]
    : (titulos[pathname] ?? [L.tituloVisao[0], L.tituloVisao[1]]);

  return (
    <div
      style={css(
        "display:flex;min-height:100vh;align-items:stretch;background:var(--bg);color:var(--tx)",
      )}
    >
      <Sidebar
        totalClientes={cs.length}
        chamadosAbertos={abertos}
        mrrValor={fmtMrr(calcMrr(cs))}
        mrrDelta={
          vazio
            ? s.idioma === "pt"
              ? "sem cobranças ativas"
              : "no active billing"
            : "+R$ 89 " + L.vsMes
        }
      />

      <main style={css("flex:1;min-width:0;display:flex;flex-direction:column")}>
        <Topbar titulo={titulo} subtitulo={subtitulo} />
        <div style={css("padding:24px 30px 44px;display:flex;flex-direction:column;gap:20px")}>
          {children}
        </div>
      </main>

      {sobreposicoes}
    </div>
  );
}
