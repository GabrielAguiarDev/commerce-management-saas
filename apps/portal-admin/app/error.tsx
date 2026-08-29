"use client";

import { ErrorPanel } from "@aguiar/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAdmin } from "@/components/AdminProvider";

/**
 * Quando uma tela do console estoura.
 *
 * POR QUE EXISTE: sem este arquivo, um `throw` numa página ou numa Server
 * Action entrega a tela de erro padrão do Next — sem marca, em inglês e sem
 * caminho de volta.
 *
 * ELE FICA DENTRO DA CASCA: o menu e a barra de topo vivem no layout, que este
 * limite não substitui. Por isso pode usar `useAdmin` — se o layout caiu, quem
 * responde é o `global-error.tsx`, e não este arquivo.
 *
 * O QUE NÃO ESTÁ AQUI: a mensagem do erro. No console ela é ainda mais sensível
 * do que no portal do cliente — as consultas daqui atravessam TODOS os tenants,
 * e um erro do Postgres nomeia tabela, política e coluna. O que aparece é o
 * `digest`, que o Next gera para cruzar a tela com o log do servidor.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { a } = useAdmin();
  const { L } = a;
  const router = useRouter();

  useEffect(() => {
    console.error("[console] a tela estourou:", error);
  }, [error]);

  return (
    <ErrorPanel
      title={L.erroTitulo}
      text={L.erroTexto}
      retryLabel={L.erroTentar}
      // `reset` refaz o limite, e só. Os dados desta tela vêm do servidor: sem
      // o `refresh`, ela remonta com o mesmo retrato que a fez estourar.
      onRetry={() => {
        router.refresh();
        reset();
      }}
      secondaryLabel={L.erroInicio}
      onSecondary={() => router.push("/")}
      digest={error.digest}
      digestLabel={L.erroCodigo}
    />
  );
}
