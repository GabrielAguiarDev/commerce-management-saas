import { AuthSkeleton } from "@/components/AuthShell";

/**
 * A entrada precisa da fronteira por dois motivos.
 *
 * O primeiro: sem este arquivo, quem cobriria o caminho para o `/login` seria o
 * `app/loading.tsx`, com o desenho da Visão — indicadores e tabelas por cima de
 * uma tela que é um cartão centralizado.
 *
 * O segundo é o "Voltar para o login" das telas de senha. Este arquivo devolvia
 * `null`, e devolver `null` NÃO é o mesmo que não ter `loading.tsx`: o arquivo,
 * só por existir, cria a fronteira de suspensão da rota, e uma fronteira que
 * resolve com nada pinta a tela inteira de branco até o servidor responder.
 *
 * Isso não aparece em desenvolvimento porque lá o `<Link>` não pré-carrega e a
 * resposta vem de `localhost` em poucos milissegundos. Em produção o `<Link>`
 * PRÉ-CARREGA, e numa rota dinâmica o que ele consegue guardar é exatamente a
 * casca até a fronteira. O clique mostra essa casca na hora — branca — e só
 * depois busca o conteúdo, agora com o middleware e a latência real no caminho.
 */
export default function Loading() {
  return <AuthSkeleton screen="login" />;
}
