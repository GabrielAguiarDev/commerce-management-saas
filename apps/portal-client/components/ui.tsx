"use client";

import { ActionMenu, type MenuAction } from "@aguiar/ui";
import { usePortal } from "@/components/PortalProvider";

/**
 * O que sobrou de próprio do portal depois que as peças comuns foram para
 * `@aguiar/ui`: só o que precisa conversar com o estado do portal.
 *
 * Cabeçalho de tela, painel, faixa de KPIs, campos, pílulas, interruptor e
 * estados vazios agora vêm da lib e são os mesmos do painel — importe-os direto
 * de `@aguiar/ui`.
 */

export type { MenuAction };

/**
 * O "⋯" de cada linha, ligado ao estado do portal.
 *
 * O portal guarda qual menu está aberto numa chave só (`s.menuLinha`), porque
 * nunca há dois abertos ao mesmo tempo. `MenuAcoes` cuida do resto: posiciona o
 * painel com o Floating UI, o joga num portal em `<body>` — para não ser
 * recortado pelo `overflow` da tabela — e fecha no Esc, no clique fora e ao
 * escolher uma ação.
 */
export function RowMenu({
  menuKey,
  actions,
  width = 210,
  label = "Ações",
}: {
  menuKey: string;
  actions: MenuAction[];
  width?: number;
  label?: string;
}) {
  const { s, a } = usePortal();

  return (
    <ActionMenu
      open={s.rowMenu === menuKey}
      onOpenChange={(open) => a.openMenu(open ? menuKey : null)}
      label={label}
      actions={actions}
      minWidth={width}
    />
  );
}
