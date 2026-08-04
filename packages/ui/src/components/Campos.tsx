"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { css, MONO, SANS } from "../css";
import { ChevronBaixoIcone, LupaIcone } from "../icons";
import { campo, NUM, ROTULO_CAMPO } from "../styleKit";

/**
 * Campos de formulário.
 *
 * Todos usam a classe `.campo` (ver `tokens.css`), que é o que garante borda,
 * raio, altura, tipografia e estados idênticos entre input, select e textarea —
 * inclusive no modo escuro, já que a classe só referencia variáveis de tema.
 *
 * `estilo` aceita uma string de declarações CSS, no mesmo formato do resto dos
 * portais, para ajustes pontuais de largura sem quebrar o padrão.
 */

type ComEstilo = { estilo?: string };

/** Espaço reservado ao chevron do `Selecao` — o mesmo de `select.campo`. */
const FOLGA_CHEVRON = 34;

export function Campo({
  estilo = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & ComEstilo) {
  return <input className="campo" style={estilo ? css(estilo) : undefined} {...props} />;
}

export function AreaTexto({
  estilo = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & ComEstilo) {
  return <textarea className="campo" style={estilo ? css(estilo) : undefined} {...props} />;
}

/**
 * Select com a aparência nativa removida e um chevron próprio.
 *
 * O ícone é um SVG em `currentColor` dentro de um invólucro posicionado, e não
 * uma imagem de fundo: assim ele acompanha o tema claro/escuro sozinho, sem
 * precisar de uma segunda cópia do ícone — que era exatamente o que deixava a
 * seta do sistema errada no tema escuro.
 *
 * `estiloCaixa` dimensiona o invólucro (o select ocupa 100% dele), porque em
 * alguns lugares o campo é fluido e em outros tem largura automática.
 */
export function Selecao({
  children,
  estiloCaixa = "",
  estilo = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & ComEstilo & { estiloCaixa?: string }) {
  return (
    <span
      style={css(
        "position:relative;display:inline-flex;align-items:center;min-width:0;" + estiloCaixa,
      )}
    >
      <select
        className="campo"
        // O espaço à direita vem depois de `estilo` de propósito: um `padding`
        // vindo de fora sobrescreveria o da classe `.campo` e jogaria o texto
        // por baixo do chevron.
        style={{ ...(estilo ? css(estilo) : null), paddingRight: FOLGA_CHEVRON }}
        {...props}
      >
        {children}
      </select>
      <span
        // `pointer-events:none` deixa o clique passar para o select por baixo.
        style={css(
          "position:absolute;right:11px;display:flex;pointer-events:none;color:var(--muted)",
        )}
      >
        <ChevronBaixoIcone />
      </span>
    </span>
  );
}

/**
 * Atalho para o caso mais comum: uma lista de strings, sem `<option>` na mão.
 * Quando o rótulo mostrado difere do valor guardado, use `Selecao` direto.
 */
export function SelecaoSimples({
  valor,
  opcoes,
  onMudar,
  estilo,
  estiloCaixa,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> &
  ComEstilo & {
    valor: string;
    opcoes: string[];
    onMudar: (v: string) => void;
    estiloCaixa?: string;
  }) {
  return (
    <Selecao
      value={valor}
      onChange={(e) => onMudar(e.target.value)}
      estilo={estilo}
      estiloCaixa={estiloCaixa}
      {...props}
    >
      {opcoes.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </Selecao>
  );
}

/**
 * Campo de busca: um input sem borda dentro de um invólucro com a lupa. É o
 * invólucro que veste a borda e recebe os estados de foco, e por isso ele fica
 * da mesma família dos selects ao lado numa barra de filtros.
 */
export function CampoBusca({
  valor,
  onChange,
  placeholder,
  estiloCaixa = "",
  compacto,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
  estiloCaixa?: string;
  compacto?: boolean;
}) {
  return (
    <div
      className="campo-caixa"
      style={css("display:flex;align-items:center;gap:8px;padding:0 11px;" + estiloCaixa)}
    >
      <span style={css("display:flex;color:var(--muted)")}>
        <LupaIcone size={compacto ? 13 : 14} />
      </span>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={css(
          "flex:1;min-width:0;border:none;background:none;outline:none;color:var(--text);" +
            (compacto ? "padding:9px 0;font-size:12.5px" : "padding:10px 0;font-size:13.5px"),
        )}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Campos rotulados                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Campo com rótulo em cima e, embaixo, a mensagem de erro ou a nota de ajuda —
 * nunca as duas, porque o erro é o que precisa ser lido primeiro.
 */
export function CampoRotulado({
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
        aria-invalid={erro || undefined}
        style={css(campo(erro) + (mono ? `;font:500 13.5px ${MONO}` : ""))}
      />
      <NotaCampo erro={erro} mensagem={mensagem} nota={nota} />
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
  moeda = "R$",
}: {
  label: string;
  valor: string;
  onMudar: (v: string) => void;
  erro?: boolean;
  mensagem?: string;
  nota?: string;
  notaCor?: string;
  grande?: boolean;
  moeda?: string;
}) {
  return (
    <div>
      <label style={css(ROTULO_CAMPO)}>{label}</label>
      <div
        style={css(
          "display:flex;align-items:center;gap:7px;padding:0 13px;border:1.5px solid " +
            `${erro ? "var(--danger)" : "var(--border2)"};border-radius:11px;background:var(--surface2)`,
        )}
      >
        <span style={css(`font:600 13px ${SANS};color:var(--muted)`)}>{moeda}</span>
        <input
          value={valor}
          onChange={(e) => onMudar(e.target.value)}
          placeholder="0,00"
          inputMode="decimal"
          aria-invalid={erro || undefined}
          style={css(
            `flex:1;min-width:0;padding:13px 0;border:0;background:none;` +
              `font:700 ${grande ? "19px" : "16px"} ${SANS};${NUM};color:var(--text);outline:none`,
          )}
        />
      </div>
      <NotaCampo erro={erro} mensagem={mensagem} nota={nota} notaCor={notaCor} />
    </div>
  );
}

function NotaCampo({
  erro,
  mensagem,
  nota,
  notaCor,
}: {
  erro?: boolean;
  mensagem?: string;
  nota?: string;
  notaCor?: string;
}) {
  if (erro && mensagem)
    return (
      <div style={css(`margin-top:5px;font:600 11.5px ${SANS};color:var(--danger)`)}>{mensagem}</div>
    );
  if (!erro && nota)
    return (
      <div style={css(`margin-top:5px;font:500 11px ${SANS};color:${notaCor ?? "var(--muted)"}`)}>
        {nota}
      </div>
    );
  return null;
}

/** Rótulo + campo empilhados, para quando o campo não é um `<input>` simples. */
export function Rotulado({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={css("display:flex;flex-direction:column;gap:6px")}>
      <span style={css(ROTULO_CAMPO + ";margin-bottom:0")}>{label}</span>
      {children}
    </label>
  );
}
