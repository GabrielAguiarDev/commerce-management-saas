import { css } from "@aguiar/ui";
import { Bar, TableSkeleton } from "@/components/Skeletons";

/**
 * O suporte é a tela de dois painéis: a lista de chamados à esquerda, a
 * conversa à direita. A largura da coluna acompanha a da tela real.
 */
export default function Loading() {
  return (
    <div
      style={css(
        "display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:16px;flex:1;min-height:0",
      )}
    >
      <TableSkeleton rows={7} title={false} />
      <div style={css("display:flex;flex-direction:column;gap:12px")}>
        <Bar w="60%" h={18} />
        <Bar w="38%" h={11} />
        <Bar h={220} />
        <Bar h={92} />
      </div>
    </div>
  );
}
