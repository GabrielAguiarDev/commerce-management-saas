import { css } from "@aguiar/ui";
import { Bar, FormSkeleton } from "@/components/Skeletons";

/** O cadastro: o "voltar", os dados do negócio e a escolha do plano. */
export default function Loading() {
  return (
    <>
      <Bar w="90px" h={13} />
      <FormSkeleton fields={6} />
      <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(232px,100%),1fr));gap:14px")}>
        {Array.from({ length: 4 }, (_, i) => (
          <Bar key={i} h={92} />
        ))}
      </div>
    </>
  );
}
