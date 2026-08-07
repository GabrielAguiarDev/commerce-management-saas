import { useEffect } from 'react';

import { onAuthStateChange } from '@domain/session/sessionService';
import { useSessionStore } from '@store/sessionStore';

/**
 * MANTÉM A SESSÃO DO APP EM DIA COM A DO SUPABASE. Monta uma vez, em
 * `AppProviders`.
 *
 * Faz duas coisas, e só elas:
 *
 *  1. **No boot**, pergunta ao Supabase se há sessão gravada (`restore`). É o
 *     que destrava o portão — enquanto `hydrated` for `false`, a splash segura.
 *
 *  2. **Depois**, escuta o Supabase para saber quando a sessão MORRE. Isso
 *     acontece sem o app pedir: refresh token revogado no painel, conta
 *     suspensa, ou dias parado até vencer. Sem escutar, o app seguiria
 *     mostrando as telas de um usuário que o servidor já não reconhece e toda
 *     consulta voltaria vazia — o que na tela parece "seu negócio não tem
 *     dados", a pior mentira possível para quem vende.
 *
 * POR QUE NÃO É UM REACT CONTEXT. O blueprint deste app já tem um dono para
 * estado global: o zustand. `useSessionStore` é legível de qualquer componente
 * sem provider, e também de fora do React — o que importa, porque os `useCases`
 * leem o `tenantId` fora de render. Um Context por cima só somaria uma segunda
 * cópia da mesma verdade e um re-render extra na árvore inteira a cada troca.
 *
 * POR QUE SÓ REAGIMOS À SESSÃO SUMINDO (e ignoramos o evento de "apareceu"):
 * o caminho de entrada já é coberto — o login escreve no store, e o boot chama
 * `restore`. Reagir também ao `true` criaria uma corrida com o próprio login,
 * que durante um instante tem sessão no Supabase e ainda não tem usuário no
 * store; o listener dispararia um `restore` concorrente e poderia ressuscitar
 * uma sessão que o service acabou de derrubar de propósito (usuário sem tenant,
 * admin de plataforma, suspenso — ver `sessionService.signIn`).
 */
export function useSessionSync(): void {
  useEffect(() => {
    void useSessionStore.getState().restore();

    return onAuthStateChange((hasSession) => {
      if (hasSession) return;

      // `getState()` e não uma dependência do efeito: reinscrever o listener a
      // cada login/logout perderia eventos exatamente na troca.
      const { user, clear } = useSessionStore.getState();
      if (user) clear();
    });
  }, []);
}
