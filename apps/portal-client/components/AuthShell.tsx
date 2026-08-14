"use client";

import { BRAND, css, SANS } from "@aguiar/ui";
import Image from "next/image";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { usePortal } from "@/components/PortalProvider";

/**
 * A moldura das telas de senha — pedir o link e escolher a nova.
 *
 * POR QUE EXISTE: as duas são a mesma página do login com outro formulário no
 * meio. Sem isto, o banner, o ladrilho do celular e o copyright estariam
 * escritos três vezes, e a primeira mudança na arte da entrada deixaria as
 * telas de senha para trás.
 *
 * O `LoginView` NÃO passou a usar esta moldura, de propósito: ele é a tela
 * mais exercitada do portal e não ganharia nada em ser mexido — o combinado
 * deste trabalho é acrescentar o fluxo de senha, não reescrever o login.
 */

/**
 * O campo. A moldura, o hover e o anel de foco vêm da classe `.field` dos
 * tokens — a borda não é redeclarada aqui, ou em `style` ela venceria a regra
 * de `:focus-visible` e o campo perderia o foco visível. É o mesmo campo alto
 * e macio da tela de entrada.
 */
export const FIELD = "padding:13px 14px;border-radius:11px;font-size:14px";

export const LABEL = `display:block;margin-bottom:6px;font:600 11px ${SANS};color:var(--text2)`;

/** O botão de ação principal destas telas: o mesmo degradê do "Entrar". */
export const AUTH_BUTTON =
  `padding:14px;border-radius:11px;font:700 14px ${SANS};color:var(--accent-ink);` +
  "background:linear-gradient(90deg, var(--accent), var(--accent-hi))";

/** O petrol do canto da arte, para o instante ANTES da imagem carregar. */
const BANNER_INK = BRAND.ink;

/** O aviso em vermelho e o em verde: o mesmo bloco, trocando o tom. */
export function AuthNotice({ tone, children }: { tone: "danger" | "pos"; children: ReactNode }) {
  return (
    <div
      style={css(
        `padding:11px 13px;border-radius:10px;background:var(--${tone}-soft);` +
          `border:1px solid var(--${tone}-line);font:600 12.5px/1.45 ${SANS};color:var(--${tone})`,
      )}
      role="alert"
    >
      {children}
    </div>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  /** O formulário. Entra dentro do `<form>` de quem chama, não daqui. */
  children: ReactNode;
}) {
  const { isMobile } = usePortal();

  return (
    <div style={css("min-height:100vh;display:flex;background:var(--surface)")}>
      {/*
        A metade da marca, igual à do login: só no desktop, e decorativa para
        quem usa leitor de tela — a mensagem inteira está dentro da imagem, e o
        nome do produto já vem no `<title>` da página.
      */}
      {!isMobile && (
        <div
          aria-hidden
          style={css(
            `position:relative;flex:1 1 50%;min-width:0;overflow:hidden;background:${BANNER_INK}`,
          )}
        >
          <Image
            src="/images/banner-login.png"
            alt=""
            fill
            priority
            sizes="50vw"
            style={{ objectFit: "cover", objectPosition: "12% center" }}
          />

          <div
            style={css(
              "position:absolute;left:0;right:0;bottom:0;height:200px;pointer-events:none;" +
                `background:linear-gradient(to top, ${BANNER_INK}, transparent)`,
            )}
          />

          <p
            style={css(
              "position:absolute;left:44px;right:44px;bottom:34px;margin:0;" +
                `font:400 12px/1.5 ${SANS};color:rgba(234,244,245,.6)`,
            )}
          >
            Copyright © {new Date().getFullYear()} Aguiar One. Todos os direitos reservados.
          </p>
        </div>
      )}

      <div
        style={css(
          "flex:1 1 50%;min-width:0;display:flex;align-items:center;justify-content:center;" +
            `padding:${isMobile ? "32px 22px" : "40px 48px"};background:var(--surface)`,
        )}
      >
        <div style={css("width:100%;max-width:360px;display:flex;flex-direction:column;gap:18px")}>
          {isMobile && (
            <div style={css("align-self:center")}>
              <Logo size={52} priority />
            </div>
          )}

          <div style={css("text-align:center")}>
            <h1 style={css(`margin:0;font:700 26px/1.2 ${SANS};color:var(--text)`)}>{title}</h1>
            <p style={css(`margin:8px 0 0;font:400 13.5px/1.5 ${SANS};color:var(--muted)`)}>
              {subtitle}
            </p>
          </div>

          {children}

          {isMobile && (
            <p
              style={css(
                `margin:6px 0 0;text-align:center;font:400 11px/1.5 ${SANS};color:var(--muted)`,
              )}
            >
              Copyright © {new Date().getFullYear()} Aguiar One. Todos os direitos reservados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
