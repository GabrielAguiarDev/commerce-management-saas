"use client";

import { ErrorPanel } from "@aguiar/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Quando uma tela do portal estoura.
 *
 * POR QUE EXISTE: sem este arquivo, um `throw` numa página ou numa Server
 * Action entrega a tela de erro padrão do Next — sem marca, sem "tentar de
 * novo" e sem caminho de volta. Quem está do outro lado é o dono de um comércio
 * no meio do expediente, e ele precisa de duas coisas: uma frase que diga se o
 * problema é dele e um botão que resolva.
 *
 * ELE FICA DENTRO DA CASCA. O menu lateral e a barra de topo vivem no layout,
 * que este limite não substitui: a pessoa continua vendo o portal em volta e
 * pode simplesmente ir para outra tela. É por isso que o painel não ocupa a
 * tela inteira.
 *
 * O QUE NÃO ESTÁ AQUI: a mensagem do erro. Um erro do Postgres nomeia a tabela,
 * a política e às vezes a coluna — é um mapa do banco entregue a quem estiver
 * olhando para a tela. O que aparece é o `digest`, que o Next gera justamente
 * para o log do servidor poder ser cruzado com o incidente.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  // O console do navegador é o único lugar onde a mensagem inteira aparece, e
  // só no aparelho de quem já está vendo o erro. Sem isto, depurar em produção
  // dependeria de o `digest` ter sido copiado da tela.
  useEffect(() => {
    console.error("[portal] a tela estourou:", error);
  }, [error]);

  return (
    <ErrorPanel
      title="Algo deu errado nesta tela"
      text="O problema é nosso, não seu — nada do que você registrou foi perdido. Tente de novo; se continuar, abra um chamado no suporte."
      retryLabel="Tentar de novo"
      // `reset` refaz o limite. Sozinho ele não relê o banco: os dados vêm do
      // servidor, e sem o `refresh` a tela remonta com exatamente o retrato que
      // a fez estourar. Os dois juntos é que dão "tentar de novo" de verdade.
      onRetry={() => {
        router.refresh();
        reset();
      }}
      secondaryLabel="Ir para o início"
      onSecondary={() => router.push("/")}
      digest={error.digest}
      digestLabel="Código do erro:"
    />
  );
}
