import { css, PANEL } from "@aguiar/ui";
import { Bar } from "@/components/Skeletons";

/** A conversa de um chamado: o "voltar", o cabeçalho e as mensagens. */
export default function Loading() {
  return (
    <div>
      <Bar w="170px" h={34} />
      <div style={css(`margin-top:13px;padding:17px 19px;${PANEL};display:flex;flex-direction:column;gap:14px`)}>
        <Bar w="120px" h={10} />
        <Bar w="min(420px,80%)" h={22} />
        <Bar h={90} />
        <Bar h={90} />
      </div>
    </div>
  );
}
