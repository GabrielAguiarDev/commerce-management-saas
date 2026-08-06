"use client";

import { css, SANS } from "@aguiar/ui";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Modais } from "@/components/modais/Modais";
import { BottomBar, Confirm, Toast, NavVeil } from "@/components/Overlays";
import { usePortal } from "@/components/PortalProvider";
import { AvisoOffline, InstalarApp } from "@/components/Pwa";
import { Sidebar } from "@/components/Sidebar";
import { Splash } from "@/components/Splash";
import { Topbar } from "@/components/Topbar";

/**
 * A moldura que toda tela compartilha: menu, topo e as sobreposições que podem
 * ser levantadas de qualquer lugar. A página do roteador entra como `children`.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  const { isMobile, d } = usePortal();
  const pathname = usePathname();

  // O login ocupa a tela inteira — sem menu, sem topo, sem barra de venda.
  const inLogin = pathname === "/login";

  /**
   * O retrato do negócio já chegou.
   *
   * `business.id` é o `tenant_id`, e ele só existe num retrato lido COM sessão
   * — em `EMPTY_DATA` é string vazia. É por isso que ele serve de sinal, e a
   * URL não serve: navegar para `/` é instantâneo, mas o layout raiz é
   * COMPARTILHADO com o `/login` e não é refeito pela navegação. Quem o refaz
   * é o `router.refresh()` que o login dispara, e é ele que demora — sete
   * consultas ao banco para montar o portal inteiro.
   *
   * Nesse intervalo a casca renderiza com o retrato VAZIO: menu lateral só com
   * o mínimo que todo cliente vê, dashboard sem os cartões que dependem do
   * plano. Quando o retrato real chega, tudo isso muda de uma vez — que é
   * exatamente o pulo que esta tela existe para cobrir.
   */
  const loaded = Boolean(d.business.id);

  // A tela de entrada fica FORA da escolha abaixo, na mesma posição do
  // fragmento nos dois casos. É o que a mantém sendo o mesmo componente
  // durante a travessia do login para o portal: trocada de lugar, ela
  // remontaria no meio do caminho e recomeçaria a contagem — a pessoa veria a
  // tela reiniciar justamente no instante em que ela deveria estar saindo.
  const splash = <Splash ready={!inLogin && loaded} />;

  if (inLogin)
    return (
      <>
        {children}
        {splash}
      </>
    );

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
            {/* Sem internet, a tela continua a mesma — o que muda é que nada
                pode ser salvo. O aviso vem antes de tudo porque é ele que
                explica o erro que a próxima ação vai dar. */}
            <AvisoOffline />

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
      <InstalarApp />
      <Modais />
      <Confirm />
      <Toast />

      {/* Por último, para nascer acima das sobreposições também — um modal
          reaberto por um refresh não pode furar a tela de entrada. */}
      {splash}
    </>
  );
}
