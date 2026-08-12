import { css, PANEL } from "@aguiar/ui";
import { Bar } from "@/components/Skeletons";

/**
 * O PDV: o catálogo à esquerda, o carrinho à direita.
 *
 * A tela de vender é a que mais se abre no dia, e é a que mais precisa parecer
 * pronta na hora — daí a grade de produtos já desenhada no lugar certo.
 */
export default function Loading() {
  return (
    <div>
      <div style={css("display:flex;align-items:center;gap:12px;margin-bottom:14px")}>
        <Bar w="36px" h={36} />
        <div style={css("display:flex;flex-direction:column;gap:7px")}>
          <Bar w="150px" h={25} />
          <Bar w="240px" h={11} />
        </div>
      </div>

      <div
        style={css(
          "display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:12px;align-items:start",
        )}
      >
        <div style={css(`padding:14px;${PANEL};display:flex;flex-direction:column;gap:12px`)}>
          <Bar h={40} />
          <div
            style={css(
              "display:grid;grid-template-columns:repeat(auto-fill,minmax(min(140px,45%),1fr));gap:10px",
            )}
          >
            {Array.from({ length: 9 }, (_, i) => (
              <Bar key={i} h={86} />
            ))}
          </div>
        </div>

        <div style={css(`padding:16px;${PANEL};display:flex;flex-direction:column;gap:12px`)}>
          <Bar w="60%" h={15} />
          <Bar h={54} />
          <Bar h={54} />
          <Bar h={44} />
        </div>
      </div>
    </div>
  );
}
