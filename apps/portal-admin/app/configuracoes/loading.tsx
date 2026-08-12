import { FormSkeleton } from "@/components/Skeletons";

/** Os ajustes da plataforma, em painéis de campos. */
export default function Loading() {
  return (
    <>
      <FormSkeleton fields={4} />
      <FormSkeleton fields={2} />
    </>
  );
}
