"use client";

import Link from "next/link";

/**
 * A marca do cabeçalho, clicável.
 *
 * ELA FAZ DUAS COISAS DIFERENTES, e é por isso que existe um componente em vez
 * de um `<Link>` cru:
 *
 *   · DENTRO DE `/sobre`, `/contato` e `/termos` — navega para a home. É o
 *     comportamento de sempre, e o `<Link>` sozinho já daria conta.
 *   · NA PRÓPRIA HOME — rola de volta ao topo. Aqui o `<Link>` sozinho NÃO
 *     serve: navegar para a rota em que já se está é um caso que o roteador
 *     resolve como quiser, e "como quiser" não é um lugar de onde tirar o
 *     comportamento de um elemento que a pessoa clica esperando voltar.
 *
 * A ROLAGEM NÃO PEDE `behavior: "smooth"`, de propósito. O `globals.css` já
 * declara `scroll-behavior: smooth` no `<html>`, e um `scrollTo` sem `behavior`
 * herda essa declaração — inclusive o `@media (prefers-reduced-motion)` logo
 * abaixo dela, que a desliga. Escrever "smooth" aqui passaria por cima da
 * preferência de quem pediu para o sistema não animar nada.
 *
 * SEM JAVASCRIPT ele continua sendo um link para `/`, que é o destino certo
 * das duas formas — o `preventDefault` só acontece se o script chegou.
 */
export function BrandLink({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href="/"
      onClick={(e) => {
        if (window.location.pathname === "/") {
          e.preventDefault();
          window.scrollTo({ top: 0 });
        }
      }}
      style={{ display: "inline-flex", alignItems: "center", borderRadius: "8px" }}
    >
      {children}
    </Link>
  );
}
