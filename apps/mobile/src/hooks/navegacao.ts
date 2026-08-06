import { router } from 'expo-router';

/**
 * Vai para uma RAIZ, zerando a pilha.
 *
 * As cinco raízes do app (Início, Produtos, o atalho Caixa/Custos, Mais e
 * Vender) não empilham entre si — é o `go()` do protótipo, que esvazia a
 * `pilha` sempre que o destino é uma delas.
 *
 * Por que não basta `router.dismissTo()`: quando o destino NÃO está na pilha,
 * o `dismissTo` substitui só a tela do topo. Saindo de Início › Estoque e
 * tocando em Produtos, o Início continuaria embaixo e o botão voltar
 * apareceria numa aba raiz — que é exatamente o que o protótipo não faz.
 *
 * `dismissAll` volta ao primeiro da pilha e `replace` troca esse primeiro pelo
 * destino: sobra uma pilha de um item só, sem voltar.
 */
export function irParaRaiz(rota: string): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace(rota as never);
}
