"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { Modal } from "@/components/Modal";
import { Dica, Toasts } from "@/components/Overlays";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { css } from "@aguiar/ui";
import { mesCorrente } from "@/lib/datas";
import { calcMrr, cobraveis, fmtMrr } from "@/lib/money";
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

  // "Resumo da operação do Aguiar One em agosto de 2026" — o mês vem do
  // relógio, não de um texto fixo do protótipo.
  const subtituloVisao = `${L.tituloVisao[1]} ${mesCorrente(s.idioma)}`;

  const titulos: Record<string, [string, string]> = {
    [ROTAS.visao]: [L.tituloVisao[0], subtituloVisao],
    [ROTAS.clientes]: [L.tituloClientes[0], L.tituloClientes[1]],
    [ROTAS.suporte]: [L.tituloSuporte[0], L.tituloSuporte[1]],
    [ROTAS.planos]: [L.tituloPlanos[0], L.tituloPlanos[1]],
    [ROTAS.modulos]: [L.tituloModulos[0], L.tituloModulos[1]],
    [ROTAS.config]: [L.tituloConfig[0], L.tituloConfig[1]],
    [ROTAS.financeiro]: [L.tituloFinanceiro[0], L.tituloFinanceiro[1]],
  };

  // /clientes/novo tem cabeçalho próprio; o segmento "novo" não é um id.
  if (pathname === ROTAS.novoCliente) {
    titulos[pathname] = [
      s.idioma === "pt" ? "Novo cliente" : "New customer",
      s.idioma === "pt"
        ? "Cadastre um novo comércio na plataforma"
        : "Register a new business on the platform",
    ];
  }

  // A customer record is titled with the business it belongs to.
  const clienteId = clienteIdDaRota(pathname);
  const cliente = clienteId != null ? clientePorId(s, clienteId) : undefined;
  const [titulo, subtitulo] = cliente
    ? [cliente.nome, L.tituloDetalhe]
    : (titulos[pathname] ?? [L.tituloVisao[0], subtituloVisao]);

  /**
   * Telas de altura travada: a janela não rola, e a área de conteúdo entrega
   * exatamente o espaço que sobra entre a barra de topo e a base — quem rola é
   * cada painel, por dentro.
   *
   * É exceção, não regra: as outras telas são listas que crescem e devem rolar
   * na página, do jeito que já faziam. Por isso o modo é escolhido pela rota em
   * vez de virar o padrão da casca.
   */
  const alturaFixa = pathname === ROTAS.suporte;

  return (
    <div
      style={css(
        "display:flex;align-items:stretch;background:var(--bg);color:var(--text);" +
          // `overflow:hidden` impede que um painel alto empurre a barra de
          // rolagem da janela de volta.
          (alturaFixa ? "height:100vh;overflow:hidden" : "min-height:100vh"),
      )}
    >
      <Sidebar
        totalClientes={cs.length}
        chamadosAbertos={abertos}
        mrrValor={fmtMrr(calcMrr(cs))}
        // Antes era "+R$ 89 vs junho", um delta inventado. Não há série
        // histórica de MRR no banco, então o rodapé diz o que dá para provar:
        // quantos clientes sustentam o valor mostrado.
        mrrDelta={
          vazio || cobraveis(cs).length === 0
            ? s.idioma === "pt"
              ? "sem cobranças ativas"
              : "no active billing"
            : `${cobraveis(cs).length} ${L.clientesCobraveis}`
        }
      />

      <main
        style={css(
          "flex:1;min-width:0;display:flex;flex-direction:column;" +
            // `min-height:0` é o que permite ao filho encolher abaixo do próprio
            // conteúdo; sem isso um item flex nunca gera scroll interno.
            (alturaFixa ? "min-height:0;overflow:hidden" : ""),
        )}
      >
        <Topbar titulo={titulo} subtitulo={subtitulo} />
        <div
          style={css(
            "display:flex;flex-direction:column;gap:20px;" +
              (alturaFixa
                ? "flex:1;min-height:0;overflow:hidden;padding:24px 30px"
                : "padding:24px 30px 44px"),
          )}
        >
          {children}
        </div>
      </main>

      {sobreposicoes}
    </div>
  );
}
