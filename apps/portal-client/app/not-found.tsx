"use client";

import { ErrorPanel } from "@aguiar/ui";
import { useRouter } from "next/navigation";

/**
 * Endereço que não existe no portal.
 *
 * É CLIENTE, e não um componente de servidor, porque o "voltar" precisa ser o
 * `router` — um `<a href="/">` recarregaria o portal inteiro (sete consultas ao
 * banco no layout) para chegar a uma tela que a navegação alcança sem sair da
 * página.
 *
 * Ela cai DENTRO da casca, com menu e topo em volta, o que já é metade da
 * resposta: a pessoa vê para onde pode ir sem precisar do botão.
 *
 * O caso mais provável não é alguém digitando um endereço errado — é um link
 * antigo, ou uma tela de módulo que o plano deixou de incluir. Por isso a frase
 * não acusa quem chegou aqui.
 */
export default function NotFound() {
  const router = useRouter();

  return (
    <ErrorPanel
      title="Esta tela não existe"
      text="O endereço pode ter mudado, ou ser de um módulo que o seu plano não inclui. Use o menu ao lado para continuar."
      retryLabel="Ir para o início"
      onRetry={() => router.push("/")}
    />
  );
}
