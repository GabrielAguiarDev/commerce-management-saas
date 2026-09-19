"use client";

import { BRAND, css, MOBILE_BREAKPOINT, SANS } from "@aguiar/ui";
import Image from "next/image";
import type { ReactNode } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { Logo } from "@/components/Logo";

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
  "align-self:flex-start;background:none;border:none;color:var(--muted);font-size:12.5px;" +
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

/**
 * A metade da marca, só no desktop. A arte agora é só ilustração — a mensagem
 * (rótulo, título, texto) é HTML por cima dela, traduzida pelo dicionário e
 * lida por leitor de tela, em vez de pintada dentro do PNG.
 */
function AdminBrandPanel({
  label,
  title,
  description,
  copyright,
}: {
  label: string;
  title: string;
  description: string;
  copyright: string;
}) {
  return (
    <aside
      style={css(
        `position:relative;flex:1 1 50%;min-width:0;overflow:hidden;background:${BANNER_INK}`,
      )}
      aria-label={label}
    >
      <Image
        src="/images/banner-login-ao.png"
        alt=""
        fill
        priority
        sizes="50vw"
        style={{ objectFit: "cover", objectPosition: "center" }}
      />

      <div
        style={css(
          "position:absolute;z-index:2;top:clamp(32px,5vh,56px);" +
            "left:clamp(40px,5.5vw,76px);right:clamp(40px,5vw,72px);max-width:460px;color:#f4fbfd",
        )}
      >
        <div style={css("display:flex;align-items:center;gap:11px")}>
          <Logo size={24} priority />
          <span style={css(`font:700 15px/1 ${SANS};letter-spacing:-.01em`)}>{label}</span>
        </div>

        <h2
          style={css(
            `margin:26px 0 0;font:700 clamp(30px,2.8vw,42px)/1.08 ${SANS};` +
              "letter-spacing:-.04em;max-width:450px",
          )}
        >
          {title}
        </h2>
        <p
          style={css(
            `margin:14px 0 0;max-width:420px;font:400 clamp(15px,1.1vw,16px)/1.55 ${SANS};` +
              "color:rgba(234,244,245,.76)",
          )}
        >
          {description}
        </p>
      </div>

      <div
        aria-hidden
        style={css(
          "position:absolute;z-index:1;left:0;right:0;bottom:0;height:190px;pointer-events:none;" +
            `background:linear-gradient(to top, ${BANNER_INK}, transparent)`,
        )}
      />

      <p
        style={css(
          `position:absolute;z-index:2;left:clamp(40px,5.5vw,76px);right:40px;bottom:34px;margin:0;` +
            `font:400 12px/1.5 ${SANS};color:rgba(234,244,245,.64)`,
        )}
      >
        {copyright}
      </p>
    </aside>
  );
}

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
        <div className="sk" style={{ width: 180, height: 12 }} />
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
      {!isMobile && (
        <AdminBrandPanel
          label={L.bannerRotulo}
          title={L.bannerTitulo}
          description={L.bannerTexto}
          copyright={copyright}
        />
      )}

      {/* A metade do formulário. `overflow-y` porque a moldura é `fixed`: a tela
          de senha nova é a mais alta das quatro e, num notebook baixo, é ela
          que precisa poder rolar em vez de ser cortada. */}
      <div
        style={css(
          "flex:1 1 50%;min-width:0;overflow-y:auto;display:flex;align-items:center;" +
            "justify-content:center;background:var(--surface);" +
            `padding:${isMobile ? "30px 22px 24px" : "clamp(48px,7vh,80px) clamp(40px,5vw,72px)"}`,
        )}
      >
        <div style={css("width:100%;max-width:400px;display:flex;flex-direction:column;gap:28px")}>
          {/* No celular o banner não entra, e sem ele a tela chegaria sem
              nenhuma marca. É o "AO" azul em PNG transparente, o mesmo do topo
              do console: pousa direto na superfície clara e não recebe cor nem
              fundo daqui. */}
          {isMobile && (
            <div style={css("display:flex;align-items:center;gap:10px")}>
              <Logo size={27} priority />
              <span style={css(`font:700 15px/1 ${SANS};color:var(--text);letter-spacing:-.01em`)}>
                {L.bannerRotulo}
              </span>
            </div>
          )}

          {header ? (
            <div style={css(STACK)}>
              <div style={css("text-align:left")}>
                <h1
                  style={css(
                    "margin:0;font-size:28px;font-weight:700;line-height:1.2;" +
                      "letter-spacing:-.025em;color:var(--text)",
                  )}
                >
                  {title}
                </h1>
                <p style={css("margin:9px 0 0;font-size:14px;line-height:1.5;color:var(--muted)")}>
                  {subtitle}
                </p>
              </div>

              {children}
            </div>
          ) : (
            children
          )}

          {footer}

          <div style={css("display:flex;flex-direction:column;align-items:flex-start;gap:8px")}>
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
