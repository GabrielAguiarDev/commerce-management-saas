"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { usePortal } from "@/components/PortalProvider";

/**
 * Módulo retirado com o portal aberto.
 *
 * O `proxy.ts` confere o plano a cada navegação e, quando a rota pede um
 * módulo que o negócio não tem mais, devolve para `/?erro=sem-permissao`. Só
 * isso não bastava: os módulos do menu vêm do layout raiz, e numa navegação o
 * Next reaproveita o layout compartilhado em vez de buscá-lo de novo. O
 * resultado era a lateral oferecendo Caixa para sempre, e cada clique nele
 * voltando para o dashboard sem explicação.
 *
 * Aqui o motivo vira aviso, o `?erro` sai da URL (para um F5 não repetir o
 * aviso) e o `refresh` busca o layout de novo — com os módulos de agora.
 */
export function AccessRevoked() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { a } = usePortal();
  const notify = a.notify;

  const revoked = params.get("erro") === "sem-permissao";

  useEffect(() => {
    if (!revoked) return;
    notify("Você não tem acesso a esse módulo. O menu foi atualizado.", "warn");
    router.replace(pathname, { scroll: false });
    router.refresh();
  }, [revoked, notify, pathname, router]);

  return null;
}
