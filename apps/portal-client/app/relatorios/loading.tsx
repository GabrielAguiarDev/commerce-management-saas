import { css } from "@aguiar/ui";
import { Bar, HeaderSkeleton, KpiSkeleton } from "@/components/Skeletons";

/** Os relatórios: os indicadores do período e os painéis de gráfico. */
export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <KpiSkeleton />
      <div
        style={css(
          "margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:12px",
        )}
      >
        <Bar h={260} />
        <Bar h={260} />
      </div>
    </>
  );
}
