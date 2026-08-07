import { Redirect } from 'expo-router';

import { StartupError } from '@components';
import { resolveEntryRoute } from '@domain/navigation/routes';
import { useAppAccess } from '@domain/session';
import { useAppHydrated } from '@hooks/useAppHydrated';
import { selectIsAuthenticated, useSessionStore } from '@store/sessionStore';

/**
 * O PORTÃO.
 *
 * Não decide nada: pergunta a `resolverRotaDeEntrada` — função pura, testada
 * no jest node — e obedece. Manter a decisão fora do componente é o que evita
 * a versão clássica deste bug: dois `useEffect` de navegação disputando, e o
 * app entrando em laço entre login e início.
 *
 * Enquanto a função devolve `null`, não renderizamos nada e a splash continua
 * segurando (o layout raiz só a esconde quando fontes e stores estão prontos).
 */
export default function Gate() {
  const hydrated = useAppHydrated();
  const isAuthenticated = useSessionStore(selectIsAuthenticated);

  // `has_module('app')` direto no banco — não derivado da carga do tenant.
  // Ver o comentário em `useAppAccess`: esta é a pergunta que decide entre
  // entrar e a tela de bloqueio, e não pode depender de outra consulta ter
  // dado certo.
  const { hasAppAccess, failed, retry } = useAppAccess();
  const signOut = useSessionStore((s) => s.signOut);

  const route = resolveEntryRoute({
    hydrated,
    isAuthenticated,
    // `null` = ainda não sei (carregando). Sem esta distinção, o instante entre
    // autenticar e a resposta chegar mandaria todo mundo para a tela de
    // bloqueio.
    hasAppAccess: isAuthenticated ? hasAppAccess : null,
  });

  // A consulta do entitlement desistiu. Antes isto era indistinguível de
  // "carregando" e o portão ficava em branco PARA SEMPRE — sem rota e sem
  // mensagem. O portão pode não saber para onde ir; o que ele não pode é ficar
  // calado. Ver StartupError.
  if (isAuthenticated && failed) {
    return <StartupError onRetry={retry} onSignOut={() => void signOut()} />;
  }

  if (!route) return null;

  return <Redirect href={route as never} />;
}
