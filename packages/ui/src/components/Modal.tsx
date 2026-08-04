"use client";

import type { ReactNode } from "react";
import { css, SANS } from "../css";
import { FecharIcone } from "../icons";
import { botaoSecundario, fundoDoTom, type Tom } from "../styleKit";

/**
 * A moldura de todo modal dos portais.
 *
 * No celular ele sobe do rodapé e encosta nas bordas — uma folha, não uma
 * caixinha centrada com o teclado por cima. No desktop fica no meio da tela.
 *
 * `mobile` vem de fora porque cada app já sabe o seu ponto de quebra; a lib não
 * observa a janela por conta própria para não duplicar esse listener.
 */
export function ModalBase({
  titulo,
  subtitulo,
  icone,
  largura = 470,
  onFechar,
  rodape,
  mobile,
  rotuloFechar = "Fechar",
  children,
}: {
  titulo: string;
  subtitulo?: string;
  /** Marca visual à esquerda do título — o aviso do que a ação vai fazer. */
  icone?: ReactNode;
  largura?: number;
  onFechar: () => void;
  rodape?: ReactNode;
  mobile?: boolean;
  rotuloFechar?: string;
  children?: ReactNode;
}) {
  return (
    <div
      onClick={onFechar}
      style={css(
        "position:fixed;inset:0;z-index:105;display:flex;justify-content:center;" +
          `align-items:${mobile ? "flex-end" : "center"};padding:${mobile ? "0" : "20px"};` +
          "background:rgba(8,17,24,.55);animation:fadein .15s ease",
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label={titulo}
        style={css(
          `width:100%;max-width:${largura}px;max-height:94vh;overflow-y:auto;` +
            `background:var(--surface);border:1px solid var(--border);` +
            `border-radius:${mobile ? "16px 16px 0 0" : "16px"};` +
            "box-shadow:var(--shadow-lg);animation:rise .2s ease",
        )}
      >
        <div
          style={css(
            "display:flex;align-items:flex-start;justify-content:space-between;gap:12px;" +
              "padding:16px 18px;border-bottom:1px solid var(--border)",
          )}
        >
          <div style={css("display:flex;align-items:flex-start;gap:13px;min-width:0")}>
            {icone}
            <div style={css("min-width:0")}>
              <h2 style={css(`margin:0;font:700 17.5px/1.2 ${SANS}`)}>{titulo}</h2>
              {subtitulo && (
                <p style={css(`margin:3px 0 0;font:400 12px/1.5 ${SANS};color:var(--muted)`)}>
                  {subtitulo}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onFechar}
            aria-label={rotuloFechar}
            className="hv-texto"
            style={css(
              "flex:none;width:32px;height:32px;display:flex;align-items:center;" +
                "justify-content:center;border-radius:8px;border:1px solid var(--border);" +
                "background:var(--surface2);color:var(--muted)",
            )}
          >
            <FecharIcone />
          </button>
        </div>

        {children && (
          <div style={css("padding:16px 18px;display:flex;flex-direction:column;gap:14px")}>
            {children}
          </div>
        )}

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
  bloqueado,
  extra,
}: {
  onCancelar: () => void;
  onConfirmar: () => void;
  textoConfirmar: string;
  textoCancelar?: string;
  corConfirmar?: string;
  corTexto?: string;
  /** Confirmação pendente — o verbo principal fica inerte até liberar. */
  bloqueado?: boolean;
  /** Uma terceira ação, à esquerda das outras duas (exportar, por exemplo). */
  extra?: ReactNode;
}) {
  return (
    <div
      style={css(
        "display:flex;gap:10px;padding:14px 18px;border-top:1px solid var(--border);" +
          "background:var(--surface2);position:sticky;bottom:0",
      )}
    >
      {extra}
      <button onClick={onCancelar} style={css(`flex:1;padding:14px;${botaoSecundario()}`)}>
        {textoCancelar}
      </button>
      <button
        onClick={onConfirmar}
        disabled={bloqueado}
        className={bloqueado ? undefined : "hv-brilho"}
        style={css(
          `flex:1;padding:14px;border-radius:11px;background:${corConfirmar};color:${corTexto};` +
            `font:700 13.5px ${SANS};` +
            (bloqueado ? "opacity:.5;cursor:not-allowed;" : ""),
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
      aria-pressed={ativo}
      style={css(
        `padding:12px 10px;border:1.5px solid ${ativo ? "var(--accent)" : "var(--border2)"};` +
          `border-radius:11px;background:${ativo ? "var(--accent-soft)" : "var(--surface2)"};` +
          `color:${ativo ? "var(--accent)" : "var(--text2)"};text-align:left`,
      )}
    >
      <span style={css(`display:block;font:700 13px ${SANS}`)}>{nome}</span>
      {nota && (
        <span style={css(`display:block;margin-top:3px;font:500 11px/1.35 ${SANS};opacity:.85`)}>
          {nota}
        </span>
      )}
    </button>
  );
}

/** Pílula de escolha — categorias, dentro de um modal. */
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
      aria-pressed={ativo}
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

/**
 * O selo quadrado ao lado do título de um modal de confirmação.
 *
 * O tom diz o peso da ação antes de o texto ser lido: vermelho para o que não
 * volta atrás, âmbar para o que dá trabalho desfazer, destaque para o resto.
 */
export function IconeModal({ tom, children }: { tom: Tom; children: ReactNode }) {
  return (
    <div
      style={css(
        "flex:none;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;" +
          "justify-content:center;font-size:15px;font-weight:700;" +
          fundoDoTom(tom),
      )}
    >
      {children}
    </div>
  );
}
