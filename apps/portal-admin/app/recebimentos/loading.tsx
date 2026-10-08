import { MetricsSkeleton, TableSkeleton } from "@/components/Skeletons";

/** Os indicadores da conta e a lista de pagamentos. */
export default function Loading() {
  return (
    <>
      <MetricsSkeleton />
      <TableSkeleton rows={9} />
    </>
  );
}
