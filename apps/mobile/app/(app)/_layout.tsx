import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  AO_FADE,
  CartBar,
  Box,
  ConfirmHost,
  SheetHost,
  StartupError,
  StartupLoading,
} from '@components';
import { ROUTES, resolveAppGate } from '@domain/navigation/routes';
import { useAppAccess } from '@domain/session';
import { useCurrentTenant } from '@domain/tenant';
import { useAppHydrated } from '@hooks/useAppHydrated';
import { useAppTheme } from '@hooks/useAppTheme';
import { selectIsAuthenticated, useSessionStore } from '@store/sessionStore';

/** O grupo `(tabs)` é o piso da pilha: um deep link em `/stock` cai sobre ele. */
export const unstable_settings = { anchor: '(tabs)' };

/**
 * O GUARDIÃO do app — e o SHELL que ele destranca.
 *
 * DECISÃO DE ARQUITETURA 1 — a verificação de acesso mora AQUI, num layout.
 *
 * Ela já foi de `app/index.tsx`. Um layout é o único lugar que envolve TODA a
 * navegação: qualquer rota de `(app)`, venha do redirect de entrada ou de um
 * deep link, monta este componente antes de montar a tela. E, por ser um
 * layout, ele monta UMA VEZ e permanece — trocar de aba não o remonta, então
 * não há o que reverificar.
 *
 * A trava (`released`) fecha o resto: uma vez liberado, refetch em segundo
 * plano, volta do background ou `onAuthStateChange` NÃO devolvem o portão para
 * "carregando". Sem ela, cada revalidação escondia a navegação inteira por um
 * instante — era isso que aparecia como a tab bar sumindo e voltando. Só a
 * sessão morrer expulsa quem já entrou (ver a ordem em `resolveAppGate`).
 *
 * DECISÃO DE ARQUITETURA 2 — a pilha é aqui; a tab bar NÃO.
 *
 * Esta é uma `Stack` de verdade — push/pop nativos, gesto de voltar do iOS,
 * `router.canGoBack()` confiável. O primeiro item dela é o navegador de abas
 * `(tabs)`, e todo o resto (Vender, Estoque, Relatórios, Configurações,
 * Suporte) são telas que SOBEM por cima dele.
 *
 * A tab bar e o botão Vender já moraram aqui, como overlay absoluto irmão da
 * pilha — o que os deixava visíveis sobre TODAS as telas, inclusive as
 * empilhadas. Eles desceram um nível, para dentro de `(tabs)/_layout.tsx`:
 * assim pertencem à tela `(tabs)` e qualquer push os cobre, que é o que
 * separa "tela de aba" de "tela interna". Ver o comentário lá.
 *
 * O que SOBROU aqui é o que precisa valer na pilha inteira:
 *
 *  - `CartBar`, porque uma venda em montagem tem que sobreviver a uma consulta
 *    de estoque — e é justamente em Vender, que é tela empilhada, que ela mais
 *    importa. Ela se reposiciona sozinha conforme haja tab bar embaixo;
 *  - `SheetHost` e `ConfirmHost`, que são modais e cobrem tudo por definição.
 */
export default function AppLayout() {
  const hydrated = useAppHydrated();
  const isAuthenticated = useSessionStore(selectIsAuthenticated);
  const signOut = useSessionStore((s) => s.signOut);

  // `has_module('app')` direto no banco — não derivado da carga do tenant.
  // Ver o comentário em `useAppAccess`: esta é a pergunta que decide entre
  // entrar e a tela de bloqueio, e não pode depender de outra consulta ter
  // dado certo.
  const { hasAppAccess, failed, retry } = useAppAccess();

  // O plano é consultado AQUI, e não só na tab bar, para que a espera aconteça
  // uma vez, antes de qualquer pixel de navegação. É o que permite à `TabBar`
  // não ter mais estado de carregamento nenhum.
  const { isPending: tenantPending } = useCurrentTenant();

  // A trava. Ajustada DURANTE o render, que é o padrão oficial do React para
  // estado derivado (`react.dev` › "Adjusting state when props change"): ela é
  // idempotente — só vai de `false` para `true` — e o React reprocessa antes de
  // pintar, sem commit intermediário. Num `useEffect` a liberação valeria só no
  // render seguinte, e é justamente esse "um render a mais" que pisca.
  const [released, setReleased] = useState(false);

  const gate = resolveAppGate({
    hydrated,
    isAuthenticated,
    hasAppAccess,
    accessFailed: failed,
    capabilitiesSettled: !tenantPending,
    released,
  });

  if (gate === 'allow' && !released) setReleased(true);

  if (gate === 'login') return <Redirect href={ROUTES.login as never} />;
  if (gate === 'blocked') return <Redirect href={ROUTES.blocked as never} />;

  // A consulta do entitlement desistiu. Antes isto era indistinguível de
  // "carregando" e o portão ficava em branco PARA SEMPRE — sem rota e sem
  // mensagem. O portão pode não saber para onde ir; o que ele não pode é ficar
  // calado. Ver StartupError.
  if (gate === 'error') {
    return <StartupError onRetry={retry} onSignOut={() => void signOut()} />;
  }

  // `hold` é a única espera do app inteiro, e dura o tempo de UMA verificação
  // na entrada. Já foi um `Box` vazio — tela lisa, sem uma palavra, e portanto
  // indistinguível de um app que travou logo depois do login. Ver StartupLoading.
  if (gate === 'hold') return <StartupLoading />;

  return <AppShell />;
}

function AppShell() {
  const theme = useAppTheme();

  return (
    // A ÚNICA transição do app que é fade — e de propósito.
    //
    // Sair da espera não é navegar: `hold` → `allow` troca o que ESTE layout
    // devolve, sem push nem replace, então não há stack para deslizar. E um
    // slide seria errado mesmo se houvesse: a `StartupLoading` não é uma tela
    // que o usuário deixou para trás, é a mesma tela terminando de carregar.
    // Deslizar inventaria um passo de navegação que ele não deu.
    //
    // Toca UMA VEZ por sessão: a trava `released` do portão não volta atrás,
    // então nem refetch em segundo plano nem volta do background remontam isto.
    <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(AO_FADE.duration)}>
      <Box flex={1} backgroundColor="bg">
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bg },
            animation: 'slide_from_right',
          }}
        >
          {/* O navegador de abas — o PISO da pilha, e a única tela daqui que
              mostra a tab bar. Sem animação: trocar de aba por dentro dele já é
              instantâneo, e animar a entrada faria a pilha piscar ao voltar de
              Estoque para uma aba. */}
          <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />

          {/* As telas INTERNAS. Todas sobem por cima de `(tabs)` em tela cheia,
              sem herdar a tab bar, e voltam com o botão voltar que o `Screen`
              desenha a partir de `router.canGoBack()`.

              `sell` está entre elas de propósito: é acionada pelo botão central
              da barra, mas precisa da tela inteira para a grade de produtos —
              então empilha como as outras em vez de virar aba. */}
          <Stack.Screen name="sell" />
          <Stack.Screen name="stock" />
          <Stack.Screen name="pending-sales" />
          <Stack.Screen name="reports" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="support" />
        </Stack>

        {/* A chrome que vale na PILHA INTEIRA. Ordem = ordem de empilhamento:
            sheet e confirm por último, porque precisam cobrir o resto.

            Nada aqui desmonta ao navegar: são irmãos da pilha, montados uma vez
            quando o guardião liberou.

            A tab bar e o botão Vender NÃO estão mais aqui — ver o cabeçalho
            deste arquivo e `(tabs)/_layout.tsx`.

            O ToastHost também não: ele vive no layout RAIZ, porque `login` e
            `blocked` também precisam dele e estão fora deste grupo. Montá-lo nos
            dois lugares mostraria o mesmo toast duplicado aqui dentro. */}
        <CartBar />
        <SheetHost />
        <ConfirmHost />
      </Box>
    </Animated.View>
  );
}
