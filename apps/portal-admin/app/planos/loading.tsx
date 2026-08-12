import { CardsSkeleton } from "@/components/Skeletons";

/** Os planos, um cartão cada. */
export default function Loading() {
  return <CardsSkeleton cards={4} />;
}
