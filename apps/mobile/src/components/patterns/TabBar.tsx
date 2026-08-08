import { usePathname } from 'expo-router';
import { Fragment } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@components/ui/Box';
import { Icon, type IconName } from '@components/ui/Icon';
import { Text } from '@components/ui/Text';
import { Touchable } from '@components/ui/Touchable';
import { tabBarItems } from '@domain/navigation/routes';
import { useCapabilities } from '@domain/tenant';
import { goToRoot } from '@hooks/navigation';

/** 88px é a altura do design. A safe area entra POR CIMA, não no lugar dela. */
export const ALTURA_TAB_BAR = 88;

/**
 * A CASCA DAS ABAS — estável nelas, ausente fora delas.
 *
 * Ela é montada uma única vez pelo layout de `(tabs)`, como overlay absoluto
 * irmão do navegador de abas, e permanece: trocar de aba não a toca, então ela
 * não pisca. Mas ela pertence à tela `(tabs)`, e é isso que faz as telas
 * INTERNAS (Vender, Estoque, Suporte, Configurações) subirem POR CIMA dela em
 * tela cheia, em vez de passarem por baixo como antes.
 *
 * Por isso ela não precisa saber em que rota está para se esconder: a estrutura
 * da navegação já responde. O `path` daqui serve só para pintar o item ativo.
 *
 * ⚠️ ESTE COMPONENTE NÃO TEM ESTADO DE CARREGAMENTO, e isso é deliberado.
 *
 * Ele já teve: `if (loading) return null`, para não mostrar "Custos" num Plano
 * Completo enquanto o plano não chegasse. O efeito colateral era pior que o
 * problema — a barra inteira sumia da tela sempre que a consulta do tenant
 * estivesse pendente, e voltava depois. Uma casca que pisca não é casca.
 *
 * A espera foi para onde ela pertence: o guardião em `(app)/_layout.tsx` só
 * libera a navegação com as capacidades já resolvidas. Quando esta barra
 * renderiza, `capabilities` já é a verdade — não há instante a esconder.
 */
export function TabBar() {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const { capabilities } = useCapabilities();

  const items = tabBarItems(capabilities);

  return (
    <Box
      position="absolute"
      left={0}
      right={0}
      bottom={0}
      backgroundColor="surface"
      borderTopWidth={1}
      borderTopColor="line"
      flexDirection="row"
      alignItems="flex-start"
      paddingTop="s9"
      paddingHorizontal="s8"
      style={{ height: ALTURA_TAB_BAR + insets.bottom, paddingBottom: insets.bottom }}
      accessibilityRole="tablist"
    >
      {items.map((item, index) => {
        const active = path === item.route;
        return (
          <Fragment key={item.key}>
            {/* O VÃO DO BOTÃO CENTRAL. 84px fixos entre o 2º e o 3º item, como
                no design — é o espaço onde o `NewSaleButton` pousa. Ele precisa
                estar AQUI, e não ser só um recuo do botão, porque as quatro
                abas são `flex: 1`: sem tirar largura do fluxo, elas se
                repartiriam a barra inteira e os rótulos ficariam por baixo do
                círculo. */}
            {index === 2 && <Box width={84} />}
            <Touchable
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (active) return;
                // As quatro abas ZERAM a pilha, como o `go()` do protótipo.
                goToRoot(item.route);
              }}
              flex={1}
              alignItems="center"
              gap="s5"
              paddingVertical="s6"
            >
              <Icon
                name={item.icon as IconName}
                size={22}
                color={active ? 'primary' : 'textMuted'}
              />
              <Text variant="tabLabel" color={active ? 'primary' : 'textMuted'}>
                {item.label}
              </Text>
            </Touchable>
          </Fragment>
        );
      })}
    </Box>
  );
}
