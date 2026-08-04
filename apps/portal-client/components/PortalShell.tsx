"use client";

import type { ReactNode } from "react";
import { Modais } from "@/components/modais/Modais";
import { BarraInferior, Confirmacao, Toast, VeuNav } from "@/components/Overlays";
import { usePortal } from "@/components/PortalProvider";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { css } from "@aguiar/ui";

/**
 * A moldura que toda tela compartilha: menu, topo e as sobreposições que podem
 * ser levantadas de qualquer lugar. A página do roteador entra como `children`.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  const { isMobile } = usePortal();

  return (
    <>
      <div style={css("display:flex;min-height:100vh;background:var(--bg)")}>
        <Sidebar />
        <VeuNav />

        <div style={css("flex:1;min-width:0;display:flex;flex-direction:column")}>
          <Topbar />
          <main
            style={css(
              `flex:1;width:100%;max-width:1360px;padding:${isMobile ? "14px 14px 0" : "20px 22px 0"}`,
            )}
          >
            {children}
            {/* Espaço para a barra fixa do celular não cobrir o fim da lista. */}
            <div style={css(`height:${isMobile ? "96px" : "40px"}`)} />
          </main>
        </div>
      </div>

      <BarraInferior />
      <Modais />
      <Confirmacao />
      <Toast />
    </>
  );
}
