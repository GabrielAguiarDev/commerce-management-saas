import { HeaderSkeleton, KpiSkeleton, TableSkeleton } from "@/components/Skeletons";

/** O caixa: os números do turno e a lista de movimentações. */
export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <KpiSkeleton cards={3} />
      <TableSkeleton rows={6} />
    </>
  );
}
