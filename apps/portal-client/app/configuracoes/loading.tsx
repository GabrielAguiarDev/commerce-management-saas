import { FormSkeleton, HeaderSkeleton } from "@/components/Skeletons";

/** As configurações: dados do negócio, formas de pagamento, equipe. */
export default function Loading() {
  return (
    <>
      <HeaderSkeleton action={false} />
      <FormSkeleton fields={6} />
      <FormSkeleton fields={3} />
    </>
  );
}
