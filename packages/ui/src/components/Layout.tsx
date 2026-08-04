"use client";

import type { CSSProperties, ReactNode } from "react";
import { css, MONO, SANS } from "../css";
import {
  botaoPrimario,
  CAIXA_VAZIA,
  faixaKpis,
  GRUPO_PILULAS,
  NUM,
  pilula,
  ROTULO_KPI,
  SUB_TELA,
  TITULO_TELA,
  trilha,
} from "../styleKit";

/**
 * As peças de layout que se repetem em mais de uma tela dos dois portais. Nada
 * aqui decide regra de negócio — só desenha o que o design já resolveu, para
 * que as views fiquem sobre o que é próprio delas.
 */

/* -------------------------------------------------------------------------- */
/* Cabeçalho de tela                                                           */
/* -------------------------------------------------------------------------- */

export function CabecalhoTela({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
}) {
  return (
    <div
      style={css(
        "display:flex;align-items:flex-end;justify-content:space-between;gap:16px;" +
          "flex-wrap:wrap;margin-bottom:18px",
      )}
    >
      <div>
        <h1 style={css(TITULO_TELA)}>{titulo}</h1>
        {subtitulo && <p style={css(SUB_TELA)}>{subtitulo}</p>}
      </div>
      {acao}
    </div>
  );
}

/** O verbo principal de uma tela, com o "+" que anuncia que algo será criado. */
export function BotaoNovo({
  texto,
  onClick,
  largo,
}: {
  texto: string;
  onClick: () => void;
  largo?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="hv-brilho"
      style={css(
        "display:flex;align-items:center;justify-content:center;gap:9px;" +
          (largo ? "flex:1 0 100%;" : "") +
          botaoPrimario(),
      )}
    >
      <span style={css(`font:600 16px/1 ${MONO}`)}>+</span>
      {texto}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Painéis                                                                     */
/* -------------------------------------------------------------------------- */

export function Painel({
  titulo,
  nota,
  acao,
  children,
  semPadding,
}: {
  titulo?: string;
  nota?: string;
  acao?: ReactNode;
  children: ReactNode;
  semPadding?: boolean;
}) {
  return (
    <div
      style={css(
        "border:1px solid var(--border);border-radius:15px;background:var(--surface);" +
          "box-shadow:var(--shadow);overflow:hidden",
      )}
    >
      {titulo && (
        <div
          style={css(
            "display:flex;align-items:flex-end;justify-content:space-between;gap:12px;" +
              "flex-wrap:wrap;padding:15px 18px;border-bottom:1px solid var(--border)",
          )}
        >
          <div>
            <h2 style={css(`margin:0;font:700 15.5px ${SANS}`)}>{titulo}</h2>
            {nota && (
              <p style={css(`margin:3px 0 0;font:400 12px/1.45 ${SANS};color:var(--muted)`)}>
                {nota}
              </p>
            )}
          </div>
          {acao}
        </div>
      )}
      <div style={css(semPadding ? "" : "padding:18px")}>{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Indicadores                                                                 */
/* -------------------------------------------------------------------------- */

export interface Kpi {
  label: string;
  valor: string;
  nota?: string;
  cor?: string;
}

/** A faixa de indicadores colados que abre as telas de lista. */
export function FaixaKpis({ kpis, colunas }: { kpis: Kpi[]; colunas: string }) {
  return (
    <div style={css(faixaKpis(colunas) + ";margin-bottom:14px")}>
      {kpis.map((k) => (
        <div key={k.label} style={css("padding:12px 15px;background:var(--surface)")}>
          <div style={css(ROTULO_KPI)}>{k.label}</div>
          <div
            style={css(
              `margin-top:5px;font:700 19px/1.1 ${SANS};${NUM};color:${k.cor ?? "var(--text)"}`,
            )}
          >
            {k.valor}
          </div>
          {k.nota && (
            <div style={css(`margin-top:3px;font:500 11.5px/1.35 ${SANS};color:var(--muted)`)}>
              {k.nota}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Estados vazios                                                              */
/* -------------------------------------------------------------------------- */

export function Vazio({
  titulo,
  texto,
  acao,
  onAcao,
  destaque,
}: {
  titulo: string;
  texto: string;
  acao?: string;
  onAcao?: () => void;
  /** Vazio de tela inteira (nunca houve nada) x vazio de filtro (não achou). */
  destaque?: boolean;
}) {
  return (
    <div style={css(CAIXA_VAZIA + (destaque ? ";padding:44px 20px;border-radius:14px" : ""))}>
      <div style={css(`font:700 ${destaque ? "16px" : "15px"} ${SANS}`)}>{titulo}</div>
      <p style={css(`margin:0;max-width:360px;font:400 12.5px/1.5 ${SANS};color:var(--muted)`)}>
        {texto}
      </p>
      {acao && onAcao && (
        <button
          onClick={onAcao}
          className="hv-brilho"
          style={css(`margin-top:10px;${botaoPrimario()}`)}
        >
          {acao}
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Filtros                                                                     */
/* -------------------------------------------------------------------------- */

export function GrupoPilulas<T extends string>({
  opcoes,
  atual,
  onEscolher,
  tamanho = "md",
}: {
  opcoes: { chave: T; nome: string }[];
  atual: T;
  onEscolher: (k: T) => void;
  tamanho?: "sm" | "md";
}) {
  return (
    <div style={css(GRUPO_PILULAS)} role="tablist">
      {opcoes.map((o) => (
        <button
          key={o.chave}
          role="tab"
          aria-selected={atual === o.chave}
          onClick={() => onEscolher(o.chave)}
          style={css(pilula(atual === o.chave, tamanho))}
        >
          {o.nome}
        </button>
      ))}
    </div>
  );
}

export function LimparFiltros({ onClick, texto = "Limpar filtros" }: { onClick: () => void; texto?: string }) {
  return (
    <button
      onClick={onClick}
      style={css(`padding:10px 13px;border-radius:10px;font:600 12.5px ${SANS};color:var(--accent)`)}
    >
      {texto}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Interruptor                                                                 */
/* -------------------------------------------------------------------------- */

/** Interruptor com título e explicação — o padrão das telas de preferências. */
export function Interruptor({
  ligado,
  onToggle,
  titulo,
  nota,
  estado,
}: {
  ligado: boolean;
  onToggle: () => void;
  titulo: string;
  nota?: string;
  estado?: string;
}) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={ligado}
      className="hv-linha2"
      style={css(
        "display:flex;align-items:center;gap:12px;padding:14px 18px;" +
          "border-bottom:1px solid var(--border);text-align:left;background:transparent",
      )}
    >
      <span style={css(trilha(ligado))}>
        <span style={css("width:18px;height:18px;border-radius:50%;background:#fff")} />
      </span>
      <span style={css("flex:1;min-width:0")}>
        <span
          style={css(
            `display:block;font:600 13.5px ${SANS};color:${ligado ? "var(--text)" : "var(--muted)"}`,
          )}
        >
          {titulo}
        </span>
        {nota && (
          <span
            style={css(
              `display:block;margin-top:2px;font:500 11.5px/1.4 ${SANS};color:var(--muted)`,
            )}
          >
            {nota}
          </span>
        )}
      </span>
      {estado && (
        <span
          style={css(
            `flex:none;font:600 11.5px ${SANS};color:${ligado ? "var(--accent)" : "var(--muted)"}`,
          )}
        >
          {estado}
        </span>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Diversos                                                                    */
/* -------------------------------------------------------------------------- */

/** Sugestões de preenchimento rápido, abaixo de um campo. */
export function Sugestoes({
  itens,
  onEscolher,
}: {
  itens: string[];
  onEscolher: (v: string) => void;
}) {
  if (!itens.length) return null;
  return (
    <div style={css("display:flex;gap:7px;margin-top:9px;flex-wrap:wrap")}>
      {itens.map((x) => (
        <button
          key={x}
          onClick={() => onEscolher(x)}
          className="hv-acc-borda"
          style={css(
            "padding:8px 12px;border-radius:999px;border:1px solid var(--border);" +
              `background:var(--surface2);color:var(--text2);font:500 12px ${SANS}`,
          )}
        >
          {x}
        </button>
      ))}
    </div>
  );
}

/** Rolagem horizontal para tabelas largas no celular. */
export function RolagemH({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ overflowX: "auto", ...style }}>{children}</div>;
}
