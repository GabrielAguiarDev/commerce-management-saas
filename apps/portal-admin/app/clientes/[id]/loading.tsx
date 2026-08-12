import { css } from "@aguiar/ui";
import { Bar, FormSkeleton } from "@/components/Skeletons";

/** A ficha do cliente: cabeçalho do negócio, dados e a grade de módulos. */
export default function Loading() {
  return (
    <>
      <Bar w="90px" h={13} />
      <FormSkeleton fields={4} />
      <div
        style={css(
          "display:grid;grid-template-columns:repeat(auto-fit,minmax(min(232px,100%),1fr));gap:14px",
        )}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <Bar key={i} h={92} />
        ))}
      </div>
    </>
  );
}
