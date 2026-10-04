import { HeaderSkeleton, KpiSkeleton, TableSkeleton } from "@/components/Skeletons";

/** Título, faixa de indicadores e o histórico — o desenho desta tela. */
export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <KpiSkeleton />
      <TableSkeleton />
    </>
  );
}
