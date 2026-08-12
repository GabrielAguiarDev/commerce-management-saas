import { css } from "@aguiar/ui";
import { Bar, TableSkeleton } from "@/components/Skeletons";

/** A lista de clientes: a faixa de filtros e a tabela. */
export default function Loading() {
  return (
    <>
      <div style={css("display:flex;align-items:center;gap:10px;flex-wrap:wrap")}>
        <Bar w="min(280px,100%)" h={38} />
        <Bar w="150px" h={38} />
        <div style={css("margin-left:auto;display:flex;gap:8px")}>
          <Bar w="120px" h={38} />
          <Bar w="140px" h={38} />
        </div>
      </div>
      <TableSkeleton rows={9} title={false} />
    </>
  );
}
