"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { useAdmin } from "@/components/AdminProvider";

/**
 * Um destino do painel, como link de verdade.
 *
 * POR QUE EXISTE: até aqui toda navegação era um `<button>` chamando
 * `irPara` — um `router.push` no clique. Funcionava, mas o Next só sabia da
 * rota no instante em que ela era pedida, então cada troca de tela pagava a ida
 * ao servidor inteira (middleware, sessão, render do segmento) com a pessoa
 * esperando. O `<Link>` anuncia o destino: o Next pré-carrega as rotas dos
 * links visíveis, e no clique a resposta já está na mão.
 *
 * O que ele NÃO abandona são os efeitos de sair de uma tela, que sempre moraram
 * no `irPara`: fechar a gaveta do celular, os menus de linha e as dicas, e — a
 * parte que não pode falhar — parar para perguntar quando há edição pendente.
 * Como o `<Link>` navega por conta própria, o que temos é a chance de cancelar;
 * é o que `antesDeNavegar` decide. Ver `AdminProvider`.
 *
 * Continua sendo um `<a>` de verdade: ⌘+clique e o botão do meio abrem em nova
 * aba, o que um `<button>` nunca fez. Nesse caminho não saímos da tela atual, e
 * por isso os efeitos ficam de fora.
 */
export type NavLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & { href: string };

export function NavLink({ href, onClick, style, ...rest }: NavLinkProps) {
  const { a } = useAdmin();

  return (
    <Link
      {...rest}
      href={href}
      // O `<button>` de antes não vinha com sublinhado nenhum. O reset do
      // Tailwind já herda a decoração do corpo, mas declarar aqui garante o
      // desenho mesmo se este link for usado fora de uma tela com o reset.
      style={{ textDecoration: "none", ...style }}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;

        // Abrir em nova aba não é sair desta tela: nada a fechar, nada a
        // perguntar. O navegador cuida do resto.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        if (!a.beforeNavigate(href)) e.preventDefault();
      }}
    />
  );
}
