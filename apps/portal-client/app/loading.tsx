import { css } from "@aguiar/ui";
import { HeaderSkeleton, KpiSkeleton, TableSkeleton } from "@/components/Skeletons";

/**
 * O painel do dia, enquanto vem.
 *
 * O menu e a barra de topo NÃO piscam: eles vivem no layout, que a navegação
 * não refaz. O que entra aqui é só a área de conteúdo.
 */
export default function Loading() {
  return (
    <>
      <HeaderSkeleton action={false} />
      <KpiSkeleton />
      <div
        style={css(
          "display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:12px",
        )}
      >
        <TableSkeleton rows={5} />
        <TableSkeleton rows={5} />
      </div>
    </>
  );
}
