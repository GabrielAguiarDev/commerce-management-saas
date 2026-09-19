"use client";

import { css, SANS } from "@aguiar/ui";
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
 * O `LoginView` também usa esta moldura. Assim, login e recuperação mantêm a
 * mesma lateral, largura de conteúdo e ritmo vertical sem duplicar o layout.
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

/** O branco azulado da arte, para o instante ANTES da imagem carregar. */
const BANNER_PAPER = "#f4f9fb";

/** A narrativa da marca que ocupa o respiro superior da ilustração. */
function ClientBrandPanel() {
  return (
    <aside
      style={css(
        `position:relative;flex:1 1 50%;min-width:0;overflow:hidden;background:${BANNER_PAPER}`,
      )}
      aria-label="Aguiar One"
    >
      <Image
        src="/images/banner-login-client.png"
        alt=""
        fill
        priority
        sizes="50vw"
        style={{ objectFit: "cover", objectPosition: "center" }}
      />

      <div
        style={css(
          "position:absolute;z-index:1;top:clamp(32px,5vh,56px);" +
            "left:clamp(40px,5.5vw,76px);right:clamp(40px,5vw,72px);max-width:440px;color:#0b2d3c",
        )}
      >
        <div style={css("display:flex;align-items:center;gap:11px")}>
          <Logo size={24} priority />
          <span style={css(`font:700 15px/1 ${SANS};letter-spacing:-.01em`)}>Aguiar One</span>
        </div>

        <h2
          style={css(
            `margin:26px 0 0;font:700 clamp(30px,2.8vw,42px)/1.08 ${SANS};` +
              "letter-spacing:-.04em;max-width:430px",
          )}
        >
          Seu negócio, em ordem.
        </h2>
        <p
          style={css(
            `margin:14px 0 0;max-width:410px;font:400 clamp(15px,1.1vw,16px)/1.55 ${SANS};` +
              "color:rgba(11,45,60,.74)",
          )}
        >
          Registre vendas, acompanhe o lucro e feche o caixa no mesmo lugar.
        </p>
      </div>

      <p
        style={css(
          `position:absolute;z-index:1;left:clamp(40px,5.5vw,76px);right:40px;bottom:34px;margin:0;` +
            `font:400 12px/1.5 ${SANS};color:rgba(0,34,52,.62)`,
        )}
      >
        Copyright © {new Date().getFullYear()} Aguiar One. Todos os direitos reservados.
      </p>
    </aside>
  );
}

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

/**
 * A moldura enquanto a rota de autenticação não chegou — o que cada
 * `loading.tsx` de `/login`, `/esqueci-senha` e `/redefinir-senha` devolve.
 *
 * POR QUE EXISTE: um `loading.tsx` que devolve `null` NÃO é o mesmo que não ter
 * `loading.tsx`. O arquivo, só por existir, cria a fronteira de suspensão da
 * rota — e uma fronteira que resolve com nada pinta a tela inteira de branco
 * até o servidor responder.
 *
 * Isso não aparece em desenvolvimento porque lá o `<Link>` não pré-carrega e a
 * resposta vem de `localhost` em poucos milissegundos: a fronteira nem chega a
 * ser desenhada. Em produção o `<Link>` PRÉ-CARREGA, e numa rota dinâmica (o
 * layout raiz é `force-dynamic`) o que ele consegue guardar é exatamente a
 * casca até a fronteira. O clique então mostra essa casca NA HORA — branca — e
 * só depois busca o conteúdo, agora com o middleware (que valida a sessão e lê
 * o perfil), o service worker e a latência real no caminho.
 *
 * Com a moldura de verdade na fronteira, a travessia entre as telas de
 * autenticação passa a ser a mesma tela trocando o miolo.
 */
export function AuthSkeleton({
  title,
  subtitle,
  fields = 2,
}: {
  title: string;
  subtitle: string;
  /** Quantos campos a tela de destino tem, para o miolo não mudar de altura. */
  fields?: number;
}) {
  return (
    <AuthShell title={title} subtitle={subtitle}>
      <div style={css("display:flex;flex-direction:column;gap:18px")} aria-hidden>
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
}: {
  title: string;
  subtitle: string;
  /** O formulário. Entra dentro do `<form>` de quem chama, não daqui. */
  children: ReactNode;
}) {
  const { isMobile } = usePortal();

  return (
    <div style={css("min-height:100vh;display:flex;background:var(--surface)")}>
      {!isMobile && <ClientBrandPanel />}

      <div
        style={css(
          "flex:1 1 50%;min-width:0;overflow-y:auto;display:flex;align-items:center;" +
            "justify-content:center;background:var(--surface);" +
            `padding:${isMobile ? "30px 22px 24px" : "clamp(48px,7vh,80px) clamp(40px,5vw,72px)"}`,
        )}
      >
        <div style={css("width:100%;max-width:400px;display:flex;flex-direction:column;gap:28px")}>
          {isMobile && (
            <div style={css("display:flex;align-items:center;gap:10px")}>
              <Logo size={27} priority />
              <span style={css(`font:700 15px/1 ${SANS};color:var(--text);letter-spacing:-.01em`)}>
                Aguiar One
              </span>
            </div>
          )}

          <div style={css("text-align:left")}>
            <h1
              style={css(
                `margin:0;font:700 28px/1.2 ${SANS};letter-spacing:-.025em;color:var(--text)`,
              )}
            >
              {title}
            </h1>
            <p style={css(`margin:9px 0 0;font:400 14px/1.5 ${SANS};color:var(--muted)`)}>
              {subtitle}
            </p>
          </div>

          {children}

          {isMobile && (
            <p style={css(`margin:0;text-align:left;font:400 11px/1.5 ${SANS};color:var(--muted)`)}>
              Copyright © {new Date().getFullYear()} Aguiar One. Todos os direitos reservados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
