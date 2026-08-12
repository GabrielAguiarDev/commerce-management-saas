import { css } from "@aguiar/ui";
import { Bar, TableSkeleton } from "@/components/Skeletons";

/** Os módulos: a nota do topo e a tabela do catálogo. */
export default function Loading() {
  return (
    <>
      <div
        style={css(
          "display:flex;align-items:center;gap:9px;padding:12px 16px;border:1px solid var(--border-soft);" +
            "background:var(--surface2);border-radius:10px",
        )}
      >
        <Bar w="min(360px,80%)" h={12} />
      </div>
      <TableSkeleton rows={7} title={false} />
    </>
  );
}
