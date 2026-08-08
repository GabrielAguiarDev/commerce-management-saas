import { router, usePathname } from 'expo-router';

import { isTabRoute } from '@domain/navigation/routes';

/**
 * IR PARA UMA ROTA QUALQUER, do jeito certo para ela.
 *
 * Existe porque o app tem duas famílias de rota e elas não se alcançam da
 * mesma forma:
 *
 *  - **aba** (Início, Produtos, Caixa, Custos, Mais) → `goToRoot`, que é um
 *    `jumpTo` dentro do navegador de abas. Sem desmontar nada, sem voltar.
 *  - **tela empilhada** (Vender, Estoque, Relatórios, Configurações, Suporte) →
 *    `push`: ela sobe por cima das abas, em tela cheia, COBRINDO a tab bar, e
 *    volta com o botão voltar do header.
 *
 * Quem chama não precisa saber em qual grupo a rota mora — a grade do "Mais" e
 * os atalhos do Início montam a lista a partir do plano e só dizem para onde
 * querem ir. Um `push` numa rota de aba não funcionaria: navegador de abas não
 * tem pilha.
 */
export function goTo(route: string): void {
  if (isTabRoute(route)) {
    goToRoot(route);
    return;
  }
  router.push(route as never);
}

/**
 * Vai para uma RAIZ, zerando a pilha.
 *
 * As cinco raízes do app (Início, Produtos, o atalho Caixa/Custos, Mais e
 * Vender) não empilham entre si — é o `go()` do protótipo, que esvazia a
 * `pilha` sempre que o destino é uma delas.
 *
 * Duas etapas, e as duas importam:
 *
 * 1. `dismissAll()` sai de qualquer tela EMPILHADA (Estoque, Suporte,
 *    Configurações…) e volta para o navegador de abas. Sem isto, tocar em
 *    "Produtos" a partir de Estoque deixaria Estoque embaixo e o botão voltar
 *    apareceria numa aba raiz — que é exatamente o que o protótipo não faz.
 *
 * 2. `navigate()` — e NÃO `replace()`. Esta é a diferença que faz a troca de
 *    aba ser instantânea. Dentro de um `Tabs`, `navigate` é um `jumpTo`: a aba
 *    de destino já está montada, então ela apenas volta a aparecer, com a
 *    rolagem e os filtros onde o usuário deixou. `replace` desmontava a aba que
 *    saía e remontava a que entrava — o "recarregamento" a cada toque.
 *
 * Para `/sell`, que é raiz mas NÃO é aba, as duas etapas juntas dão o resultado
 * certo: sai de qualquer tela empilhada e sobe UMA tela de Vender sobre as
 * abas. Voltar de lá cai na aba de origem, com a tab bar de volta.
 */
export function goToRoot(route: string): void {
  if (router.canDismiss()) router.dismissAll();
  router.navigate(route as never);
}

/**
 * A tela atual é uma ABA (com tab bar embaixo) ou uma tela empilhada?
 *
 * A pergunta existe porque a tab bar deixou de ser universal: ela agora vive
 * dentro do grupo `(tabs)` e some quando qualquer tela sobe por cima. Tudo que
 * se posiciona a partir do rodapé — a barra do carrinho, o toast, o espaço
 * reservado no fim do conteúdo — precisa saber se aqueles 88px existem nesta
 * tela, senão flutua alto demais nas telas internas.
 *
 * A regra em si continua sendo a função pura `isTabRoute`, testada no node;
 * aqui é só a leitura do caminho atual.
 */
export function useOnTabScreen(): boolean {
  return isTabRoute(usePathname());
}
