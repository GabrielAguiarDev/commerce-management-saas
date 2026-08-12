import { MetricsSkeleton, TableSkeleton } from "@/components/Skeletons";

/** O financeiro: os indicadores de cobrança e a lista de mensalidades. */
export default function Loading() {
  return (
    <>
      <MetricsSkeleton />
      <TableSkeleton rows={9} />
    </>
  );
}
