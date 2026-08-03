"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePortal } from "@/components/PortalProvider";
import { css, MONO, SANS } from "@/lib/css";
import {
  BOTAO_MENU,
  botaoPrimario,
  CAIXA_VAZIA,
  campo,
  faixaKpis,
  GRUPO_PILULAS,
  MENU_FLUTUANTE,
  NUM,
  pilula,
  ROTULO_CAMPO,
  ROTULO_KPI,
  SUB_TELA,
  TITULO_TELA,
  trilha,
} from "@/lib/styleKit";

/**
 * As peças que se repetem em mais de uma tela. Nada aqui decide regra de
 * negócio — só desenha o que o design já resolveu, para que as views fiquem
 * sobre o que é próprio delas.
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
        "display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px",
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
        `display:flex;align-items:center;justify-content:center;gap:9px;${largo ? "flex:1 0 100%;" : ""}` +
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
        "border:1px solid var(--border);border-radius:15px;background:var(--surface);box-shadow:var(--shadow);overflow:hidden",
      )}
    >
      {titulo && (
        <div
          style={css(
            "display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:15px 18px;border-bottom:1px solid var(--border)",
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
/* KPIs                                                                        */
/* -------------------------------------------------------------------------- */

export interface Kpi {
  label: string;
  valor: string;
  nota?: string;
  cor?: string;
}

/** A faixa de indicadores colados, usada em Produtos, Estoque, Custos e Suporte. */
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
    <div style={css(GRUPO_PILULAS)}>
      {opcoes.map((o) => (
        <button key={o.chave} onClick={() => onEscolher(o.chave)} style={css(pilula(atual === o.chave, tamanho))}>
          {o.nome}
        </button>
      ))}
    </div>
  );
}

export function Selecao({
  valor,
  opcoes,
  onMudar,
  estilo,
}: {
  valor: string;
  opcoes: string[];
  onMudar: (v: string) => void;
  estilo?: string;
}) {
  return (
    <select
      value={valor}
      onChange={(e) => onMudar(e.target.value)}
      style={css(
        estilo ??
          "padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface);" +
            `font:600 12.5px ${SANS};color:var(--text2);outline:none`,
      )}
    >
      {opcoes.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function LimparFiltros({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={css(`padding:10px 13px;border-radius:10px;font:600 12.5px ${SANS};color:var(--accent)`)}
    >
      Limpar filtros
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Menu de linha                                                               */
/* -------------------------------------------------------------------------- */

export interface AcaoMenu {
  texto: string;
  onClick: () => void;
  /** Ação destrutiva ou de atenção — ganha cor própria. */
  cor?: string;
}

/**
 * O "⋯" de cada linha e o painel que ele abre.
 *
 * O clique para de propagar porque o provider fecha qualquer menu no primeiro
 * clique do documento — sem isso o menu abriria e fecharia no mesmo gesto.
 */
export function MenuLinha({ chave, acoes, largura = 210 }: { chave: string; acoes: AcaoMenu[]; largura?: number }) {
  const { s, a } = usePortal();
  const aberto = s.menuLinha === chave;

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          a.toggleMenu(chave);
        }}
        title="Ações"
        className="hv-menu"
        style={css(`justify-self:end;${BOTAO_MENU}`)}
      >
        ⋯
      </button>
      {aberto && (
        <div onClick={(e) => e.stopPropagation()} style={css(`${MENU_FLUTUANTE};width:${largura}px`)}>
          {acoes.map((x) => (
            <button
              key={x.texto}
              onClick={x.onClick}
              className="hv-linha2"
              style={css(
                `display:block;width:100%;padding:10px 11px;border-radius:8px;text-align:left;` +
                  `font:${x.cor ? "600" : "500"} 13px ${SANS};color:${x.cor ?? "var(--text2)"}`,
              )}
            >
              {x.texto}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Formulário                                                                  */
/* -------------------------------------------------------------------------- */

export function Campo({
  label,
  valor,
  onMudar,
  placeholder,
  erro,
  mensagem,
  nota,
  inputMode,
  mono,
}: {
  label: string;
  valor: string;
  onMudar: (v: string) => void;
  placeholder?: string;
  erro?: boolean;
  mensagem?: string;
  nota?: string;
  inputMode?: "numeric" | "decimal";
  mono?: boolean;
}) {
  return (
    <div>
      <label style={css(ROTULO_CAMPO)}>{label}</label>
      <input
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        style={css(campo(erro) + (mono ? `;font:500 13.5px ${MONO}` : ""))}
      />
      {erro && mensagem && (
        <div style={css(`margin-top:5px;font:600 11.5px ${SANS};color:var(--danger)`)}>
          {mensagem}
        </div>
      )}
      {!erro && nota && (
        <div style={css(`margin-top:5px;font:500 11px ${SANS};color:var(--muted)`)}>{nota}</div>
      )}
    </div>
  );
}

/** Campo de dinheiro: o "R$" fica fixo dentro da borda, fora do que se digita. */
export function CampoDinheiro({
  label,
  valor,
  onMudar,
  erro,
  mensagem,
  nota,
  notaCor,
  grande,
}: {
  label: string;
  valor: string;
  onMudar: (v: string) => void;
  erro?: boolean;
  mensagem?: string;
  nota?: string;
  notaCor?: string;
  grande?: boolean;
}) {
  return (
    <div>
      <label style={css(ROTULO_CAMPO)}>{label}</label>
      <div
        style={css(
          `display:flex;align-items:center;gap:7px;padding:0 13px;border:1.5px solid ${erro ? "var(--danger)" : "var(--border2)"};border-radius:11px;background:var(--surface2)`,
        )}
      >
        <span style={css(`font:600 13px ${SANS};color:var(--muted)`)}>R$</span>
        <input
          value={valor}
          onChange={(e) => onMudar(e.target.value)}
          placeholder="0,00"
          inputMode="decimal"
          style={css(
            `flex:1;min-width:0;padding:13px 0;border:0;background:none;font:700 ${grande ? "19px" : "16px"} ${SANS};${NUM};color:var(--text);outline:none`,
          )}
        />
      </div>
      {erro && mensagem && (
        <div style={css(`margin-top:5px;font:600 11.5px ${SANS};color:var(--danger)`)}>
          {mensagem}
        </div>
      )}
      {!erro && nota && (
        <div style={css(`margin-top:5px;font:600 11px ${SANS};color:${notaCor ?? "var(--muted)"}`)}>
          {nota}
        </div>
      )}
    </div>
  );
}

/** Interruptor com título e explicação — o padrão das Preferências. */
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
      className="hv-linha2"
      style={css(
        "display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border);text-align:left;background:transparent",
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
          <span style={css(`display:block;margin-top:2px;font:500 11.5px/1.4 ${SANS};color:var(--muted)`)}>
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
/* Barra de sugestões                                                          */
/* -------------------------------------------------------------------------- */

export function Sugestoes({ itens, onEscolher }: { itens: string[]; onEscolher: (v: string) => void }) {
  if (!itens.length) return null;
  return (
    <div style={css("display:flex;gap:7px;margin-top:9px;flex-wrap:wrap")}>
      {itens.map((x) => (
        <button
          key={x}
          onClick={() => onEscolher(x)}
          className="hv-acc-borda"
          style={css(
            `padding:8px 12px;border-radius:999px;border:1px solid var(--border);background:var(--surface2);color:var(--text2);font:500 12px ${SANS}`,
          )}
        >
          {x}
        </button>
      ))}
    </div>
  );
}

/** Barra de rolagem horizontal para tabelas largas no celular. */
export function RolagemH({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ overflowX: "auto", ...style }}>{children}</div>;
}
