"use client";

import { BRAND, css, MOBILE_BREAKPOINT } from "@aguiar/ui";
import Image from "next/image";
import type { ReactNode } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";

/**
 * A moldura das quatro telas de acesso do console: entrar, pedir o link,
 * confirmar o envio e escolher a nova senha.
 *
 * POR QUE EXISTE: as telas de senha são a mesma página do login com outro
 * formulário no meio. Sem isto, o banner, o ladrilho do celular e o copyright
 * estariam escritos quatro vezes, e a primeira mudança na arte da entrada
 * deixaria as telas de senha para trás.
 *
 * Diferente do portal do cliente, aqui o `LoginView` TAMBÉM usa esta moldura:
 * ela saiu de dentro dele: era o único lugar onde este desenho existia. O que
 * mudou no login foi só isso — a casca virou importação. O formulário, o
 * `signInWithPassword` e as mensagens continuam exatamente como estavam.
 */

/**
 * O campo. Moldura, hover e anel de foco vêm da classe `.field` dos tokens —
 * por isso a borda NÃO é redeclarada aqui: em `style` ela venceria a regra de
 * `:focus-visible` e o campo perderia o foco visível. O inline traz só o que
 * estas telas têm de próprio: um campo mais alto e mais macio que o do resto do
 * console, porque aqui ele é o assunto da página.
 */
export const FIELD = "padding:13px 14px;border-radius:11px;font-size:14px";

export const LABEL =
  "font-size:11.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)";

/**
 * O botão principal. O degradê vai do `--accent` ao `--accent-hi`, e os dois
 * viram com o tema — o botão continua sendo o mesmo botão no claro e no escuro.
 */
export const AUTH_BUTTON =
  "background:linear-gradient(90deg, var(--accent), var(--accent-hi));border:none;" +
  "color:var(--accent-ink);font-size:14px;font-weight:700;padding:14px;border-radius:11px;" +
  "cursor:pointer";

/** O link discreto embaixo do formulário — "voltar para o login" e parentes. */
export const AUTH_LINK =
  "align-self:center;background:none;border:none;color:var(--muted);font-size:12.5px;" +
  "cursor:pointer;padding:0";

/** O empilhamento do miolo. A tela de "link enviado" respira mais apertado. */
export const stack = (gap = "18px") => `display:flex;flex-direction:column;gap:${gap}`;

export const STACK = stack();

/**
 * O fundo do painel do banner.
 *
 * É o mesmo petrol quase preto do arquivo — o `--side` da barra lateral —, e
 * existe para o instante ANTES da imagem carregar: sem ele o primeiro quadro da
 * tela é metade branca, e a página pisca ao ser preenchida.
 */
const BANNER_INK = BRAND.ink;

/** O aviso em vermelho e o em verde: o mesmo bloco, trocando o tom. */
export function AuthNotice({ tone, children }: { tone: "danger" | "pos"; children: ReactNode }) {
  return (
    <span
      role="alert"
      style={css(
        `font-size:12px;color:var(--${tone});background:var(--${tone}-soft);` +
          `border:1px solid var(--${tone}-line);border-radius:10px;padding:11px 13px`,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A moldura enquanto a rota de autenticação não chegou — o que cada
 * `loading.tsx` de `/esqueci-senha` e `/redefinir-senha` devolve.
 *
 * POR QUE EXISTE: um `loading.tsx` que devolve `null` NÃO é o mesmo que não ter
 * `loading.tsx`. O arquivo, só por existir, cria a fronteira de suspensão da
 * rota — e uma fronteira que resolve com nada pinta a tela inteira de branco
 * até o servidor responder. Com a moldura de verdade ali, a travessia entre as
 * telas de acesso passa a ser a mesma tela trocando o miolo.
 */
export function AuthSkeleton({
  screen,
}: {
  /** Qual das três telas está a caminho: muda o título e a contagem de campos. */
  screen: "login" | "forgot" | "reset";
}) {
  const { a } = useAdmin();
  const { L } = a;

  // O título sai do dicionário aqui dentro, e não das props: um `loading.tsx` é
  // Server Component e não alcança o idioma escolhido, que vive no estado do
  // console.
  const { title, subtitle, fields } = {
    login: { title: L.entrarTitulo, subtitle: L.entrarSub, fields: 2 },
    forgot: { title: L.esqueciTitulo, subtitle: L.esqueciSub, fields: 1 },
    reset: { title: L.redefinirTitulo, subtitle: L.redefinirSub, fields: 2 },
  }[screen];

  return (
    <AuthShell title={title} subtitle={subtitle}>
      <div style={css(STACK)} aria-hidden>
        {Array.from({ length: fields }, (_, i) => (
          <div key={i}>
            {/* As alturas copiam as do formulário real (rótulo, campo e botão
                com o `padding` de `FIELD` e `AUTH_BUTTON`): é o que impede a
                tela de saltar no instante em que o conteúdo entra. */}
            <div className="sk" style={{ width: 64, height: 11, marginBottom: 6 }} />
            <div className="sk" style={{ width: "100%", height: 44, borderRadius: 11 }} />
          </div>
        ))}

        <div className="sk" style={{ width: "100%", height: 47, borderRadius: 11 }} />
        <div className="sk" style={{ width: 180, height: 12, alignSelf: "center" }} />
      </div>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  /**
   * O cabeçalho sai quando a própria tela desenha o seu — é o caso do "link
   * enviado", que abre com o sinal de confirmado no lugar do título comum.
   */
  header = true,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  header?: boolean;
  /** O que vem depois do miolo, ainda dentro da coluna. */
  footer?: ReactNode;
}) {
  const { s, a } = useAdmin();
  const { L } = a;

  // Abaixo disso o banner sai e o formulário fica com a tela inteira. O estado
  // nasce em 1440, e é essa a largura que o servidor renderiza: assim o
  // primeiro pixel vem na versão de desktop em vez de saltar.
  const isMobile = s.screenWidth < MOBILE_BREAKPOINT;

  const copyright = `Copyright © ${new Date().getFullYear()} Aguiar One. ${L.direitosReservados}`;

  return (
    <div style={css("position:fixed;inset:0;z-index:60;display:flex;background:var(--surface)")}>
      {/*
        A metade da marca. Só no desktop: abaixo de 900px ela viraria uma tarja
        de imagem espremida por cima do formulário, e o que a pessoa veio fazer
        aqui é entrar. No lugar dela, o formulário ganha o ladrilho do "A".

        Toda a mensagem — logo, tarja "Área administrativa", título, subtítulo e
        os três pilares — está DENTRO do arquivo: é a arte da marca, não um
        texto que esta tela remonta com `<h1>` e `<p>` por cima de um fundo. Por
        isso o `alt` é vazio e o painel é `aria-hidden`: para quem usa leitor de
        tela isto é decoração, e o nome do console já vem no `<title>` da página
        e no letreiro ao lado do formulário.
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
            /**
             * A imagem é quadrada e o painel é uma coluna alta: com `cover` o
             * que sobra é cortado nas LATERAIS. `object-position` puxa o corte
             * para a direita — o texto da arte mora na metade esquerda, e é ele
             * que não pode encostar na borda; o que cede é o "A" de fundo.
             */
            style={{ objectFit: "cover", objectPosition: "12% center" }}
          />

          {/* A base da arte é escura, mas não uniformemente: esta sombra é o
              que garante o contraste da linha de copyright em cima dela. */}
          <div
            style={css(
              "position:absolute;left:0;right:0;bottom:0;height:200px;pointer-events:none;" +
                `background:linear-gradient(to top, ${BANNER_INK}, transparent)`,
            )}
          />

          <p
            style={css(
              "position:absolute;left:44px;right:44px;bottom:34px;margin:0;font-size:12px;" +
                "line-height:1.5;color:rgba(234,244,245,.6)",
            )}
          >
            {copyright}
          </p>
        </div>
      )}

      {/* A metade do formulário. `overflow-y` porque a moldura é `fixed`: a tela
          de senha nova é a mais alta das quatro e, num notebook baixo, é ela
          que precisa poder rolar em vez de ser cortada. */}
      <div
        style={css(
          "flex:1 1 50%;min-width:0;overflow-y:auto;display:flex;align-items:center;" +
            `justify-content:center;padding:${isMobile ? "32px 22px" : "40px 48px"}`,
        )}
      >
        <div style={css("width:100%;max-width:380px;display:flex;flex-direction:column;gap:26px")}>
          {/* No celular o banner não entra, e sem ele a tela chegaria sem
              nenhuma marca. É o "A" azul em PNG transparente, o mesmo do topo
              do console: pousa direto na superfície clara e não recebe cor nem
              fundo daqui. */}
          {isMobile && (
            <div style={css("display:flex;align-items:center;justify-content:center;gap:12px")}>
              <Logo size={42} priority />
              <div style={css("display:flex;flex-direction:column;gap:2px")}>
                <Wordmark size={20} on="surface" />
                <span
                  style={css(
                    "font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)",
                  )}
                >
                  {L.console}
                </span>
              </div>
            </div>
          )}

          {header ? (
            <div style={css(STACK)}>
              {/* O cabeçalho de cada tela, centrado como na entrada do portal
                  do cliente. */}
              <div style={css("text-align:center")}>
                <h1
                  style={css(
                    "margin:0;font-size:26px;font-weight:700;line-height:1.2;color:var(--text)",
                  )}
                >
                  {title}
                </h1>
                <p
                  style={css(
                    "margin:8px 0 0;font-size:13.5px;line-height:1.5;color:var(--muted)",
                  )}
                >
                  {subtitle}
                </p>
              </div>

              {children}
            </div>
          ) : (
            children
          )}

          {footer}

          <div style={css("display:flex;flex-direction:column;align-items:center;gap:8px")}>
            <span style={css("font-size:11.5px;color:var(--muted)")}>{L.acessoRestrito}</span>

            {/* No desktop o copyright fica sobre o banner; sem ele, é aqui. */}
            {isMobile && (
              <span style={css("font-size:11px;line-height:1.5;color:var(--muted)")}>
                {copyright}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
