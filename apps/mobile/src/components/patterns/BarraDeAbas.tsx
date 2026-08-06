import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@components/ui/Box';
import { Icone, type NomeIcone } from '@components/ui/Icone';
import { Text } from '@components/ui/Text';
import { Toque } from '@components/ui/Toque';
import { itensDaTabBar } from '@domain/navigation/rotas';
import { useCapacidades } from '@domain/tenant';
import { irParaRaiz } from '@hooks/navegacao';

/** 88px é a altura do design. A safe area entra POR CIMA, não no lugar dela. */
export const ALTURA_TAB_BAR = 88;

export function BarraDeAbas() {
  const insets = useSafeAreaInsets();
  const caminho = usePathname();
  const { capacidades, carregando } = useCapacidades();

  // Enquanto o plano não chegou, todas as capacidades são falsas e o 3º item
  // seria "Custos" mesmo num Plano Completo. Segurar a barra por esse instante
  // é melhor que mostrá-la trocando de rótulo na cara do usuário.
  if (carregando) return null;

  const itens = itensDaTabBar(capacidades);

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
      {itens.map((item) => {
        const ativo = caminho === item.rota;
        return (
          <Toque
            key={item.chave}
            accessibilityLabel={item.rotulo}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativo }}
            onPress={() => {
              if (ativo) return;
              // As quatro abas ZERAM a pilha, como o `go()` do protótipo.
              irParaRaiz(item.rota);
            }}
            flex={1}
            alignItems="center"
            gap="s5"
            paddingVertical="s6"
          >
            <Icone
              nome={item.icone as NomeIcone}
              tamanho={22}
              cor={ativo ? 'primary' : 'textMuted'}
            />
            <Text variant="tabLabel" color={ativo ? 'primary' : 'textMuted'}>
              {item.rotulo}
            </Text>
          </Toque>
        );
      })}
    </Box>
  );
}
