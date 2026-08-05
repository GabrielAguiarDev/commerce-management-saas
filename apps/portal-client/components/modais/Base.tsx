"use client";

import { ModalFrame as ModalBaseUI } from "@aguiar/ui";
import type { ComponentProps, ReactNode } from "react";
import { usePortal } from "@/components/PortalProvider";

/**
 * A moldura do modal, ligada ao estado do portal.
 *
 * O desenho — a folha que sobe do rodapé no celular, a caixa centrada no
 * desktop, o cabeçalho e o rodapé grudado — vem de `@aguiar/ui` e é o mesmo do
 * painel. O que este arquivo acrescenta é só o `isMobile`, que a lib não tem
 * como saber sozinha.
 *
 * `RodapeModal`, `EscolhaCartao` e `PilulaEscolha` também estão na lib —
 * importe-os direto de `@aguiar/ui`.
 */
export function ModalFrame({
  children,
  ...props
}: Omit<ComponentProps<typeof ModalBaseUI>, "mobile"> & { children?: ReactNode }) {
  const { isMobile } = usePortal();
  return (
    <ModalBaseUI mobile={isMobile} {...props}>
      {children}
    </ModalBaseUI>
  );
}
