import { CardsSkeleton } from "@/components/Skeletons";

/** Os cartões da vitrine, um bloco largo cada. */
export default function Loading() {
  return <CardsSkeleton cards={2} minWidth={600} />;
}
