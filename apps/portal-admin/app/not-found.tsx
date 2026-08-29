"use client";

import { ErrorPanel } from "@aguiar/ui";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/components/AdminProvider";

/**
 * Endereço que não existe no console.
 *
 * O caso provável não é alguém digitando errado: é `/clientes/<id>` de um
 * cliente que foi excluído — um link guardado, uma aba antiga, o botão "voltar"
 * depois de uma exclusão. Por isso a frase menciona o registro excluído em vez
 * de acusar o endereço.
 *
 * É CLIENTE porque o "voltar" precisa ser o `router`: um `<a href="/">`
 * recarregaria o console inteiro — o layout raiz faz sete leituras para montar
 * clientes, chamados, módulos, planos, financeiro e configurações.
 */
export default function NotFound() {
  const { a } = useAdmin();
  const { L } = a;
  const router = useRouter();

  return (
    <ErrorPanel
      title={L.naoEncontradoTitulo}
      text={L.naoEncontradoTexto}
      retryLabel={L.erroInicio}
      onRetry={() => router.push("/")}
    />
  );
}
