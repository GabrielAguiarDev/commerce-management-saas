"use client";

import { Button, css, MONO, SANS } from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";
import { MODULES } from "@/lib/dados/perfis";
import { ROUTES } from "@/lib/rotas";
import type { CatalogModule } from "@/types/types";

/**
 * O cartão que fecha a última linha oferecendo o que falta.
 *
 * POR QUE ELE EXISTE: a grade dos números tem tamanho variável — quem não tem
 * Caixa nem Estoque vê cinco cartões, quem tem tudo vê sete —, e ela fecha a
 * última linha esticando quem sobrou. Este cartão entra como ÚLTIMO item da
 * contagem, que é onde `distribuirSpans` põe a maior largura: quando há sobra
 * para distribuir, é ele quem a recebe, e é ele quem melhor a aproveita, porque
 * tem título, nome, uma frase e um botão, e não um número. Some sozinho quando
 * não há mais nada para oferecer.
 *
 * NÃO TEM VARIANTE HORIZONTAL, ao contrário do `MetricCard`. Ele não tem um
 * número grande para deixar perdido num retângulo largo: são quatro blocos
 * empilhados que reflowam sozinhos, e a mesma pilha se lê bem numa coluna ou em
 * três. O que o distingue dos vizinhos é a borda e o fundo de acento, que não
 * dependem de largura nenhuma.
 *
 * NÃO É UM NÚMERO, e não finge ser: fundo e borda de acento em vez do painel
 * branco, e nada de verde — verde neste dashboard é lucro, e uma oferta não é
 * lucro de ninguém. Também não mostra dado nenhum do módulo oferecido, porque
 * não tem nenhum: o que chega aqui é nome e frase de catálogo.
 */
export function SuggestedModuleCard({
  module,
  spanDesktop,
  spanMobile,
}: {
  module: CatalogModule;
  spanDesktop: number;
  spanMobile: number;
}) {
  const { a } = usePortal();

  return (
    <div
      style={css(
        "display:flex;flex-direction:column;height:100%;min-height:132px;padding:16px;border-radius:14px;" +
          "border:2px solid var(--accent-line);background:var(--accent-soft);" +
          `--span-d:${spanDesktop};--span-m:${spanMobile}`,
      )}
    >
      <div style={css("display:flex;align-items:center;gap:8px")}>
        <span
          style={css(
            "flex:none;width:18px;height:18px;border-radius:6px;display:flex;align-items:center;justify-content:center;" +
              `font:600 8.5px ${MONO};background:var(--accent);color:var(--accent-ink)`,
          )}
        >
          {MODULES[module.key].initials}
        </span>
        <span style={css(`font:600 12px ${SANS};color:var(--accent-text)`)}>Módulo sugerido</span>
      </div>

      <div
        style={css(
          `margin-top:10px;font:700 clamp(17px,1.7vw,21px)/1.15 ${SANS};letter-spacing:-.02em;color:var(--text)`,
        )}
      >
        {module.name}
      </div>

      <p style={css(`margin:5px 0 0;font:500 11.5px/1.4 ${SANS};color:var(--text2)`)}>
        {module.benefit}
      </p>

      <Button
        onClick={() => a.goTo(ROUTES.support)}
        className="hv-glow"
        style={css(
          "margin-top:auto;align-self:flex-start;padding:8px 14px;border-radius:9px;" +
            `background:var(--accent);color:var(--accent-ink);font:700 12px ${SANS}`,
        )}
      >
        Quero este módulo
      </Button>
    </div>
  );
}
