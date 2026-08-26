import { notFound } from "next/navigation";

import { NotasView } from "@/components/views/NotasView";
import { isComingSoon } from "@/lib/modulos";

/**
 * A lista de notas emitidas.
 *
 * ENQUANTO O MÓDULO ESTIVER "EM BREVE", ESTA ROTA É UM 404 — e é de propósito.
 *
 * O cliente não deve descobrir que existe nota fiscal aqui dentro. Uma tela
 * dizendo "em breve" seria propaganda de uma coisa que ainda não tem data: ela
 * gera a pergunta no suporte ("quando sai?") que não temos como responder, e um
 * link salvo continuaria lembrando dela toda semana. Um 404 não promete nada.
 *
 * `notFound()` e não `redirect()`: a rota precisa ficar indistinguível de uma
 * que nunca existiu. Um redirecionamento para o painel diria, para quem repara,
 * que o endereço existe e está fechado.
 *
 * A tela continua inteira em `components/views/NotasView.tsx` — quando a chave
 * sair de `COMING_SOON_MODULES`, esta rota volta a renderizá-la sem mais nada.
 * Ver `docs/fiscal/fase-2-emissao.md`.
 */
export default function Page() {
  if (isComingSoon("fiscal")) notFound();

  return <NotasView />;
}
