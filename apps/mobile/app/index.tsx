import { Redirect } from 'expo-router';

import { resolveEntryRoute } from '@domain/navigation/routes';
import { useCapabilities } from '@domain/tenant';
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
  const { capabilities, loading } = useCapabilities();

  const route = resolveEntryRoute({
    hydrated,
    isAuthenticated,
    // `null` = ainda não sei. Sem esta distinção, o instante entre autenticar e
    // o plano chegar mandaria todo mundo para a tela de bloqueio.
    hasAppAccess: !isAuthenticated ? null : loading ? null : capabilities.hasAppAccess,
  });

  if (!route) return null;

  return <Redirect href={route as never} />;
}
