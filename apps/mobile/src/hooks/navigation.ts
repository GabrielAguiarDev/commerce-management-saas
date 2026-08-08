import { router } from 'expo-router';

import { isTabRoute } from '@domain/navigation/routes';

/**
 * IR PARA UMA ROTA QUALQUER, do jeito certo para ela.
 *
 * Existe porque o app tem duas famílias de rota e elas não se alcançam da
 * mesma forma:
 *
 *  - **aba** (Início, Produtos, Caixa, Custos, Mais) → `goToRoot`, que é um
 *    `jumpTo` dentro do navegador de abas. Sem desmontar nada, sem voltar.
 *  - **tela empilhada** (Estoque, Relatórios, Configurações, Suporte) →
 *    `push`, com botão voltar e a tab bar continuando visível por cima.
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
 * Para `/sell`, que é raiz mas NÃO é aba, `navigate` empilha sobre as abas —
 * com a tab bar continuando visível por cima, porque ela é overlay do layout.
 */
export function goToRoot(route: string): void {
  if (router.canDismiss()) router.dismissAll();
  router.navigate(route as never);
}
