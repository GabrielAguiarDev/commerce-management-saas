import { Redirect } from 'expo-router';

import { resolveEntryRoute } from '@domain/navigation/routes';
import { useAppHydrated } from '@hooks/useAppHydrated';
import { selectIsAuthenticated, useSessionStore } from '@store/sessionStore';

/**
 * A PORTA DA RUA.
 *
 * Não decide nada: pergunta a `resolveEntryRoute` — função pura, testada no
 * jest node — e obedece. Manter a decisão fora do componente é o que evita a
 * versão clássica deste bug: dois `useEffect` de navegação disputando, e o app
 * entrando em laço entre login e início.
 *
 * ⚠️ ELA NÃO PERGUNTA MAIS PELO ENTITLEMENT. Quem verifica o acesso é o
 * GUARDIÃO em `app/(app)/_layout.tsx`, e a mudança conserta dois problemas de
 * uma vez:
 *
 *  1. `/` é rota de PASSAGEM — o `Redirect` abaixo a desmonta no mesmo instante.
 *     Quem chega por deep link em `/home` nunca passou por aqui, e passava
 *     direto pela verificação. O guardião, sendo um LAYOUT, envolve toda a
 *     navegação e não tem essa porta dos fundos.
 *  2. Verificar acima das abas permite verificar UMA VEZ. Ver `resolveAppGate`.
 *
 * Enquanto a função devolve `null`, não renderizamos nada e a splash continua
 * segurando (o layout raiz só a esconde quando fontes e stores estão prontos).
 */
export default function Entry() {
  const hydrated = useAppHydrated();
  const isAuthenticated = useSessionStore(selectIsAuthenticated);

  const route = resolveEntryRoute({ hydrated, isAuthenticated });

  if (!route) return null;

  return <Redirect href={route as never} />;
}
