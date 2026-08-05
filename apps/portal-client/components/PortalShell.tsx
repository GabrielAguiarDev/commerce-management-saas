"use client";

import { css, SANS } from "@aguiar/ui";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Modais } from "@/components/modais/Modais";
import { BottomBar, Confirm, Toast, NavVeil } from "@/components/Overlays";
import { usePortal } from "@/components/PortalProvider";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

/**
 * A moldura que toda tela compartilha: menu, topo e as sobreposições que podem
 * ser levantadas de qualquer lugar. A página do roteador entra como `children`.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  const { isMobile, d } = usePortal();
  const pathname = usePathname();

  // O login ocupa a tela inteira — sem menu, sem topo, sem barra de venda.
  if (pathname === "/login") return <>{children}</>;

  return (
    <>
      <div style={css("display:flex;min-height:100vh;background:var(--bg)")}>
        <Sidebar />
        <NavVeil />

        <div style={css("flex:1;min-width:0;display:flex;flex-direction:column")}>
          <Topbar />
          <main
            style={css(
              `flex:1;width:100%;max-width:1360px;padding:${isMobile ? "14px 14px 0" : "20px 22px 0"}`,
            )}
          >
            {/* Leitura que falhou não vira "lista vazia": a tela diz o que houve,
                ou a pessoa passaria a tarde procurando vendas que existem. */}
            {d.error && (
              <div
                style={css(
                  "margin-bottom:16px;padding:13px 15px;border:1px solid var(--warn);border-radius:12px;" +
                    `background:var(--warn-soft);font:600 12.5px/1.5 ${SANS};color:var(--warn)`,
                )}
                role="alert"
              >
                Não foi possível carregar os dados do seu negócio. {d.error}
              </div>
            )}

            {children}
            {/* Espaço para a barra fixa do celular não cobrir o fim da lista. */}
            <div style={css(`height:${isMobile ? "96px" : "40px"}`)} />
          </main>
        </div>
      </div>

      <BottomBar />
      <Modais />
      <Confirm />
      <Toast />
    </>
  );
}
