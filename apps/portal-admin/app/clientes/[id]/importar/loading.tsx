import { Bar, FormSkeleton } from "@/components/Skeletons";

/** A importação de catálogo: o "voltar" e os painéis de cada passo. */
export default function Loading() {
  return (
    <>
      <Bar w="130px" h={13} />
      <FormSkeleton fields={2} />
      <FormSkeleton fields={2} />
    </>
  );
}
