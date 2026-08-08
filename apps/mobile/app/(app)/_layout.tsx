import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';

import { TabBar, CartBar, NewSaleButton, Box, ConfirmHost, SheetHost, StartupError } from '@components';
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
 * DECISÃO DE ARQUITETURA 2 — pilha com overlay, e não abas na raiz.
 *
 * O protótipo tem tab bar sempre visível E botão voltar em metade das telas
 * (`pilha` + `go()`). Aqui a navegação é um `Stack` de verdade — push/pop
 * nativos, gesto de voltar do iOS, `router.canGoBack()` confiável — e a tab
 * bar, o FAB, a barra do carrinho, o confirm e o sheet são um overlay absoluto
 * IRMÃO da pilha. É a leitura literal do protótipo, onde essa chrome é
 * `position:absolute` sobre o conteúdo rolável, e é o que mantém a barra
 * visível também em Estoque, Suporte e Configurações.
 *
 * As quatro raízes da tab bar não são telas desta pilha: vivem no navegador de
 * abas `(tabs)`, o primeiro item dela. Ver `app/(app)/(tabs)/_layout.tsx`.
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
  // na entrada. Fundo do tema, não branco: vindo do login, a splash já saiu.
  if (gate === 'hold') return <Box flex={1} backgroundColor="bg" />;

  return <AppShell />;
}

function AppShell() {
  const theme = useAppTheme();

  return (
    <Box flex={1} backgroundColor="bg">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          animation: 'slide_from_right',
        }}
      >
        {/* O navegador de abas. Sem animação: trocar de aba por dentro dele já
            é instantâneo, e animar a entrada faria a pilha piscar ao voltar de
            Estoque para uma aba. */}
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="sell" />
        <Stack.Screen name="stock" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="support" />
      </Stack>

      {/* A chrome. Ordem = ordem de empilhamento: sheet e confirm por último,
          porque precisam cobrir a tab bar e o FAB.

          Nada aqui desmonta ao navegar: são irmãos da pilha, montados uma vez
          quando o guardião liberou. A `TabBar` em particular não tem mais
          estado de carregamento — as capacidades já chegaram lá em cima.

          O ToastHost NÃO está aqui: ele vive no layout RAIZ, porque `login` e
          `blocked` também precisam dele e estão fora deste grupo. Montá-lo nos
          dois lugares mostraria o mesmo toast duplicado aqui dentro. */}
      <TabBar />
      <NewSaleButton />
      <CartBar />
      <SheetHost />
      <ConfirmHost />
    </Box>
  );
}
