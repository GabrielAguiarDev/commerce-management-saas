"use client";

import type { ReactNode } from "react";
import { usePortal } from "@/components/PortalProvider";
import { css, MONO, SANS } from "@/lib/css";

/**
 * A moldura de todo modal do portal.
 *
 * No celular ele sobe do rodapé e encosta nas bordas — uma folha, não uma
 * caixinha centrada com o teclado por cima. No desktop fica no meio da tela.
 */
export function ModalBase({
  titulo,
  subtitulo,
  largura = 470,
  onFechar,
  rodape,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  largura?: number;
  onFechar: () => void;
  rodape?: ReactNode;
  children: ReactNode;
}) {
  const { isMobile } = usePortal();

  return (
    <div
      onClick={onFechar}
      style={css(
        "position:fixed;inset:0;z-index:105;display:flex;justify-content:center;" +
          `align-items:${isMobile ? "flex-end" : "center"};padding:${isMobile ? "0" : "20px"};` +
          "background:rgba(8,17,24,.55);animation:fadein .15s ease",
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label={titulo}
        style={css(
          `width:100%;max-width:${largura}px;max-height:94vh;overflow-y:auto;background:var(--surface);` +
            `border:1px solid var(--border);border-radius:${isMobile ? "16px 16px 0 0" : "16px"};` +
            "box-shadow:var(--shadow-lg);animation:rise .2s ease",
        )}
      >
        <div
          style={css(
            "display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid var(--border)",
          )}
        >
          <div>
            <h2 style={css(`margin:0;font:700 17.5px/1.2 ${SANS}`)}>{titulo}</h2>
            {subtitulo && (
              <p style={css(`margin:3px 0 0;font:400 12px/1.5 ${SANS};color:var(--muted)`)}>
                {subtitulo}
              </p>
            )}
          </div>
          <button
            onClick={onFechar}
            title="Fechar"
            style={css(
              "flex:none;width:32px;height:32px;border-radius:8px;border:1px solid var(--border);" +
                `background:var(--surface2);color:var(--muted);font:600 14px ${MONO}`,
            )}
          >
            ×
          </button>
        </div>

        <div style={css("padding:16px 18px;display:flex;flex-direction:column;gap:14px")}>{children}</div>

        {rodape}
      </div>
    </div>
  );
}

/** Cancelar à esquerda, confirmar à direita — e grudado no fundo ao rolar. */
export function RodapeModal({
  onCancelar,
  onConfirmar,
  textoConfirmar,
  textoCancelar = "Cancelar",
  corConfirmar = "var(--accent)",
  corTexto = "var(--accent-ink)",
}: {
  onCancelar: () => void;
  onConfirmar: () => void;
  textoConfirmar: string;
  textoCancelar?: string;
  corConfirmar?: string;
  corTexto?: string;
}) {
  return (
    <div
      style={css(
        "display:flex;gap:10px;padding:14px 18px;border-top:1px solid var(--border);" +
          "background:var(--surface2);position:sticky;bottom:0",
      )}
    >
      <button
        onClick={onCancelar}
        style={css(
          `flex:1;padding:14px;border-radius:11px;border:1px solid var(--border2);background:var(--surface);color:var(--text2);font:600 13.5px ${SANS}`,
        )}
      >
        {textoCancelar}
      </button>
      <button
        onClick={onConfirmar}
        className="hv-brilho"
        style={css(
          `flex:1;padding:14px;border-radius:11px;background:${corConfirmar};color:${corTexto};font:700 13.5px ${SANS}`,
        )}
      >
        {textoConfirmar}
      </button>
    </div>
  );
}

/** Botão de escolha exclusiva — tipo de custo, tipo de movimentação. */
export function EscolhaCartao({
  nome,
  nota,
  ativo,
  onClick,
}: {
  nome: string;
  nota?: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={css(
        `padding:12px 10px;border:1.5px solid ${ativo ? "var(--accent)" : "var(--border2)"};border-radius:11px;` +
          `background:${ativo ? "var(--accent-soft)" : "var(--surface2)"};` +
          `color:${ativo ? "var(--accent)" : "var(--text2)"};text-align:left`,
      )}
    >
      <span style={css(`display:block;font:700 13px ${SANS}`)}>{nome}</span>
      {nota && <span style={css(`display:block;margin-top:3px;font:500 11px/1.35 ${SANS};opacity:.85`)}>{nota}</span>}
    </button>
  );
}

/** Pílula de escolha — categorias, no modal de custo. */
export function PilulaEscolha({
  nome,
  ativo,
  onClick,
}: {
  nome: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={css(
        `padding:9px 13px;border-radius:999px;border:1px solid ${ativo ? "var(--accent)" : "var(--border)"};` +
          `background:${ativo ? "var(--accent-soft)" : "var(--surface2)"};` +
          `color:${ativo ? "var(--accent)" : "var(--text2)"};font:600 12px ${SANS}`,
      )}
    >
      {nome}
    </button>
  );
}
