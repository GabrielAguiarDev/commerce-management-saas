import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";

/**
 * "A vitrine mudou, gere a página de novo."
 *
 * Quem chama é o console, depois de salvar um cartão (ver
 * `apps/portal-admin/lib/revalidarLanding.ts`). Sem esta rota, uma edição só
 * apareceria na virada do `revalidate` por tempo — até uma hora de espera para
 * ver um preço corrigido no ar.
 *
 * ┌─ O QUE ELA PODE FAZER, E SÓ ───────────────────────────────────────────┐
 * │ Descartar o HTML de `/`. Não lê banco, não escreve nada, não recebe    │
 * │ corpo e não olha para nenhum parâmetro. O pior que um atacante         │
 * │ consegue com o segredo em mãos é fazer a página ser gerada de novo —   │
 * │ com o mesmo conteúdo. É por isso que ela pode existir num site         │
 * │ público: a superfície é uma porta que só sabe dizer "releia".          │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * SÓ `POST`. Um `GET` seria disparado por qualquer rastreador, pré-carregador
 * de link ou olhada no histórico do navegador.
 */

/** Nunca prerenderizar nem cachear: é um comando, e roda a cada chamada. */
export const dynamic = "force-dynamic";

/**
 * Comparação em tempo constante.
 *
 * Um `===` vaza o tamanho do prefixo acertado pelo tempo que leva para
 * responder, e com chamadas suficientes isso reconstrói o segredo caractere a
 * caractere. O custo de fazer certo é esta função.
 *
 * O tamanho é comparado ANTES, e separado: `timingSafeEqual` exige buffers do
 * mesmo tamanho e lança se não forem. O tamanho do segredo não é o segredo.
 */
function segredoConfere(enviado: string, esperado: string): boolean {
  const a = Buffer.from(enviado);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const esperado = process.env.REVALIDATE_SECRET;

  // Sem segredo configurado a rota não vira uma porta aberta: ela deixa de
  // existir. Um deploy que esqueceu a variável não pode ser um deploy em que
  // qualquer um manda a página ser regerada.
  if (!esperado) {
    console.error("[revalidate] REVALIDATE_SECRET não configurado — rota desativada.");
    return new Response("Not found", { status: 404 });
  }

  const enviado = request.headers.get("x-revalidate-secret");

  // 404 e não 401: para quem não tem o segredo, esta rota não existe. Um 401
  // confirmaria o endereço e convidaria a insistir.
  if (!enviado || !segredoConfere(enviado, esperado)) {
    console.warn("[revalidate] recusado: segredo ausente ou incorreto.");
    return new Response("Not found", { status: 404 });
  }

  // ┌─ UMA CHAMADA DERRUBA AS DUAS COISAS ────────────────────────────────┐
  // │ `revalidatePath("/")` descarta o HTML pronto E as respostas de      │
  // │ `fetch` feitas durante a geração daquela rota — o Next marca cada   │
  // │ uma com a etiqueta interna do caminho. Sem essa segunda parte, a    │
  // │ página seria gerada de novo e leria a MESMA resposta velha do       │
  // │ banco, porque a entrada de fetch tem janela própria de uma hora.    │
  // │                                                                     │
  // │ Uma etiqueta declarada por nós não acrescentaria nada aqui, e no    │
  // │ Next 16 `revalidateTag` ainda exige um perfil de cache como segundo │
  // │ argumento — mais superfície para o mesmo efeito. O caminho ponta a  │
  // │ ponta foi medido: editar no console e chamar esta rota publica o    │
  // │ texto novo na requisição seguinte.                                  │
  // │                                                                     │
  // │ `/` e não o layout inteiro: a vitrine aparece numa página só.       │
  // └─────────────────────────────────────────────────────────────────────┘
  revalidatePath("/");

  console.log("[revalidate] página inicial revalidada.");
  return Response.json({ revalidated: true, at: new Date().toISOString() });
}
