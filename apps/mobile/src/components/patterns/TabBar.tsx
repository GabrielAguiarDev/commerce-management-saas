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

import {
  ALTURA_TAB_BAR,
  BASE_ROTULO_TAB,
  GAP_ITEM_TAB,
  TAMANHO_ICONE_TAB,
  VAO_BOTAO_VENDER,
} from './tabBarGeometry';

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
      // `stretch`, e não `flex-start`: os alvos tocáveis ocupam a altura útil
      // INTEIRA da barra, enquanto o ícone e o rótulo se posicionam dentro
      // deles. Antes os itens tinham a altura do próprio conteúdo e o resto da
      // barra era vazio morto — dedo grande em balcão errava a aba por acertar
      // o vazio.
      alignItems="stretch"
      paddingHorizontal="s8"
      style={{ height: ALTURA_TAB_BAR + insets.bottom, paddingBottom: insets.bottom }}
      accessibilityRole="tablist"
    >
      {items.map((item, index) => {
        const active = path === item.route;
        return (
          <Fragment key={item.key}>
            {/* O VÃO DO BOTÃO CENTRAL, entre o 2º e o 3º item — o espaço onde o
                `NewSaleButton` pousa. Ver `VAO_BOTAO_VENDER`. */}
            {index === 2 && <Box width={VAO_BOTAO_VENDER} />}
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
              justifyContent="flex-end"
            >
              {/* O bloco ícone+rótulo, apoiado a `BASE_ROTULO_TAB` da base da
                  área útil. Medido daqui de baixo, e não centralizado por conta
                  própria, porque é esta mesma medida que o "Vender" usa para
                  alinhar o rótulo dele com estes quatro. */}
              <Box
                alignItems="center"
                style={{ gap: GAP_ITEM_TAB, paddingBottom: BASE_ROTULO_TAB }}
              >
                <Icon
                  name={item.icon as IconName}
                  size={TAMANHO_ICONE_TAB}
                  color={active ? 'primary' : 'textMuted'}
                />
                <Text variant="tabLabel" color={active ? 'primary' : 'textMuted'}>
                  {item.label}
                </Text>
              </Box>
            </Touchable>
          </Fragment>
        );
      })}
    </Box>
  );
}
