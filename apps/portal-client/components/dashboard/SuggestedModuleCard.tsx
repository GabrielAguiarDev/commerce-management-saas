"use client";

import { Button, css, MONO, SANS } from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";
import { PLAN_CATEGORY } from "@/lib/dados/chamados";
import { MODULES } from "@/lib/dados/perfis";
import { ehLargo } from "@/lib/grid";
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
 * DOIS FEITIOS, como o `MetricCard`, e escolhidos do mesmo jeito (`ehLargo` +
 * `.suggest-card` em `globals.css`):
 *  - largo: uma faixa centrada na vertical — ícone do módulo, rótulo, nome e
 *    frase à esquerda; o botão à direita, na mesma linha de centro. Empilhado
 *    num retângulo de três colunas, o conteúdo grudava no topo, sobrava um
 *    vazio embaixo e o botão flutuava sem relação com o texto;
 *  - estreito: o mesmo bloco no topo e o botão no rodapé, alinhado ao rodapé
 *    dos cartões vizinhos.
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

  const wideD = ehLargo(spanDesktop);
  const wideM = ehLargo(spanMobile);

  return (
    <div
      className="suggest-card"
      style={css(
        "height:100%;min-height:132px;box-sizing:border-box;padding:18px 20px;border-radius:14px;" +
          "border:2px solid var(--accent-line);background:var(--accent-soft);" +
          `--span-d:${spanDesktop};--span-m:${spanMobile};` +
          `--dir-d:${wideD ? "row" : "column"};--dir-m:${wideM ? "row" : "column"};` +
          `--align-d:${wideD ? "center" : "stretch"};--align-m:${wideM ? "center" : "stretch"};` +
          `--btn-d:${wideD ? "auto" : "flex-start"};--btn-m:${wideM ? "auto" : "flex-start"}`,
      )}
    >
      <div style={css("display:flex;align-items:center;gap:14px;min-width:0")}>
        <span
          aria-hidden
          style={css(
            "flex:none;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;" +
              `font:700 13px ${MONO};letter-spacing:.02em;background:var(--accent);color:var(--accent-ink)`,
          )}
        >
          {MODULES[module.key].initials}
        </span>

        <div style={css("min-width:0")}>
          <div
            style={css(
              `font:700 10.5px ${SANS};letter-spacing:.08em;text-transform:uppercase;color:var(--accent-text)`,
            )}
          >
            Módulo sugerido
          </div>
          <div
            style={css(
              `margin-top:3px;font:700 19px/1.2 ${SANS};letter-spacing:-.02em;color:var(--text)`,
            )}
          >
            {module.name}
          </div>
          <p style={css(`margin:3px 0 0;font:500 12px/1.4 ${SANS};color:var(--text2)`)}>
            {module.benefit}
          </p>
        </div>
      </div>

      <Button
        onClick={() => {
          // Leva para o Suporte com o pedido já montado: categoria, assunto e
          // o módulo nomeado. Antes o botão só abria a lista de chamados, e a
          // pessoa tinha de adivinhar onde e como pedir o que acabou de ver.
          a.goTo(ROUTES.support);
          a.openNewTicket({
            category: PLAN_CATEGORY,
            subject: `Quero o módulo ${module.name}`,
            description: `Tenho interesse em ativar o módulo ${module.name} (${module.benefit.toLowerCase()}).`,
          });
        }}
        className="hv-glow"
        style={css(
          "flex:none;align-self:var(--btn-self);padding:10px 18px;border-radius:10px;white-space:nowrap;" +
            `background:var(--accent);color:var(--accent-ink);font:700 12.5px ${SANS}`,
        )}
      >
        Quero este módulo →
      </Button>
    </div>
  );
}
