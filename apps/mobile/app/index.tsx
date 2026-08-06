import { Redirect } from 'expo-router';

import { resolverRotaDeEntrada } from '@domain/navigation/rotas';
import { useCapacidades } from '@domain/tenant';
import { useAppHydrated } from '@hooks/useAppHydrated';
import { selecionarAutenticado, useSessaoStore } from '@store/sessaoStore';

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
export default function Portao() {
  const hidratado = useAppHydrated();
  const autenticado = useSessaoStore(selecionarAutenticado);
  const { capacidades, carregando } = useCapacidades();

  const rota = resolverRotaDeEntrada({
    hidratado,
    autenticado,
    // `null` = ainda não sei. Sem esta distinção, o instante entre autenticar e
    // o plano chegar mandaria todo mundo para a tela de bloqueio.
    temAcessoAoApp: !autenticado ? null : carregando ? null : capacidades.acessoApp,
  });

  if (!rota) return null;

  return <Redirect href={rota as never} />;
}
