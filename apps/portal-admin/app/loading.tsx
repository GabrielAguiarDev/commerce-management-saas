import { css } from "@aguiar/ui";
import { MetricsSkeleton, TableSkeleton } from "@/components/Skeletons";

/**
 * A Visão, enquanto vem.
 *
 * A barra lateral e a barra de topo NÃO piscam: elas vivem no layout, que a
 * navegação não refaz. O que entra aqui é só a área de conteúdo — os quatro
 * indicadores e os dois painéis de baixo, no lugar onde vão aparecer.
 */
export default function Loading() {
  return (
    <>
      <MetricsSkeleton />
      <div
        style={css(
          "display:grid;grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr));" +
            "align-items:stretch;gap:16px",
        )}
      >
        <TableSkeleton rows={5} />
        <TableSkeleton rows={5} />
      </div>
    </>
  );
}
