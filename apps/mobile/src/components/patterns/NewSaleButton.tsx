import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@components/ui/Box';
import { Icon } from '@components/ui/Icon';
import { Text } from '@components/ui/Text';
import { Touchable } from '@components/ui/Touchable';
import { ROUTES, tabBarItems, tabBarSalePlacement } from '@domain/navigation/routes';
import { useCapabilities } from '@domain/tenant';
import { goToRoot } from '@hooks/navigation';

import { BASE_ROTULO_TAB, TAMANHO_BOTAO_VENDER } from './tabBarGeometry';

/**
 * O botão CENTRAL da tab bar — "Vender".
 *
 * Ele existe quando o guardião libera `/sell` E a quantidade de tabs permite
 * uma composição simétrica. Com três tabs, Vender vira o quarto item regular
 * dentro da `TabBar`; aqui e o vão central desaparecem juntos.
 *
 * ELE PARECE UMA ABA MAS NÃO É UMA. Vender é uma tela de PILHA, fora do grupo
 * `(tabs)`: precisa da tela inteira para a grade de produtos, então sobe por
 * cima e cobre esta barra. Como consequência o rótulo nunca fica ativo — este
 * botão só existe nas abas, e nas abas nunca estamos em `/sell`. O estado ativo
 * que havia aqui era código morto e saiu.
 *
 * A geometria é expressa DE BAIXO PARA CIMA, e isso é o que a mantém correta
 * sozinha: o rótulo pousa na mesma linha dos rótulos das abas
 * (`BASE_ROTULO_TAB`, acima da safe area) e o círculo cresce para cima a partir
 * dele. Mudar a altura da barra ou o tamanho do círculo reposiciona o conjunto
 * inteiro sem nenhum segundo número para acertar à mão.
 *
 * O vão que ele ocupa é reservado pela própria `TabBar`. Ver o espaçador lá.
 */
export function NewSaleButton() {
  const insets = useSafeAreaInsets();
  const { capabilities } = useCapabilities();
  const items = tabBarItems(capabilities);

  if (tabBarSalePlacement(items, capabilities) !== 'raised') return null;

  return (
    <Box
      position="absolute"
      left={0}
      right={0}
      alignItems="center"
      style={{ bottom: BASE_ROTULO_TAB + insets.bottom }}
      // Sem isto, esta caixa cobriria a largura inteira da barra e engoliria os
      // toques das tabs dinâmicas que passam por baixo dela.
      pointerEvents="box-none"
    >
      <Touchable
        accessibilityLabel="Nova venda"
        // EMPILHA, não troca de aba: `goToRoot` limpa a pilha e sobe Vender
        // sobre as abas, em tela cheia. Voltar de lá cai na aba de origem, com
        // a tab bar de volta.
        onPress={() => goToRoot(ROUTES.sell)}
        alignItems="center"
        gap="s8"
      >
        <Box
          width={TAMANHO_BOTAO_VENDER}
          height={TAMANHO_BOTAO_VENDER}
          borderRadius="full"
          backgroundColor="primary"
          alignItems="center"
          justifyContent="center"
        >
          {/* 22 acompanha o círculo: o design usa 20 num círculo de 44, e é
              essa proporção (~0,45) que mantém o ícone respirando dentro dele. */}
          <Icon name="cart" size={22} color="onPrimary" />
        </Box>

        <Text variant="tabLabel" color="textMuted">
          Vender
        </Text>
      </Touchable>
    </Box>
  );
}
