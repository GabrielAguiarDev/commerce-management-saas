"use client";

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { css } from "@/lib/css";
import { ChevronBaixoIcone } from "@/lib/icons";

/**
 * Campos de formulário do painel.
 *
 * Todos usam a classe `.campo` (ver globals.css), que é o que garante borda,
 * raio, altura, tipografia e estados idênticos entre input, select e textarea —
 * inclusive no modo escuro, já que a classe só referencia variáveis de tema.
 *
 * `estilo` aceita uma string de declarações CSS, no mesmo formato do resto do
 * painel, para ajustes pontuais de largura sem quebrar o padrão.
 */

type ComEstilo = { estilo?: string };

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
 * precisar de uma segunda cópia do ícone.
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
      <select className="campo" style={estilo ? css(estilo) : undefined} {...props}>
        {children}
      </select>
      <span
        // `pointer-events:none` deixa o clique passar para o select por baixo.
        style={css(
          "position:absolute;right:11px;display:flex;pointer-events:none;color:var(--tx3)",
        )}
      >
        <ChevronBaixoIcone />
      </span>
    </span>
  );
}
