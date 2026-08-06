import { ScrollView } from 'react-native';

import { Box } from './Box';
import { Text } from './Text';
import { Toque } from './Toque';

export interface OpcaoDeChip<T extends string> {
  chave: T;
  rotulo: string;
}

interface ChipsProps<T extends string> {
  opcoes: readonly OpcaoDeChip<T>[];
  selecionada: T;
  aoSelecionar: (chave: T) => void;
  /** `pilula` = raio 999 (Produtos/Relatórios); `caixa` = raio 12 (Custos). */
  forma?: 'pilula' | 'caixa';
  /** Chips que dividem a largura em vez de rolar (a fileira de Custos). */
  expandir?: boolean;
}

/**
 * Fileira de chips de filtro.
 *
 * Rola na horizontal por padrão porque "Personalizado" não cabe na tela com os
 * outros três; `expandir` desliga a rolagem e divide a largura em partes
 * iguais, que é como Custos usa.
 *
 * `accessibilityState.selected` importa: sem ele, o leitor de tela anuncia
 * quatro botões idênticos e o usuário não sabe qual filtro está ativo.
 */
export function Chips<T extends string>({
  opcoes,
  selecionada,
  aoSelecionar,
  forma = 'pilula',
  expandir = false,
}: ChipsProps<T>) {
  const conteudo = opcoes.map((o) => {
    const ativo = o.chave === selecionada;
    return (
      <Toque
        key={o.chave}
        accessibilityLabel={o.rotulo}
        accessibilityState={{ selected: ativo }}
        onPress={() => aoSelecionar(o.chave)}
        flex={expandir ? 1 : undefined}
        height={expandir ? 38 : 36}
        paddingHorizontal={expandir ? 's0' : forma === 'pilula' ? 's14' : 's13'}
        borderRadius={forma === 'pilula' ? 'full' : 'r12'}
        borderWidth={1}
        borderColor={ativo ? 'primary' : 'line'}
        backgroundColor={ativo ? 'primary' : 'surface'}
        alignItems="center"
        justifyContent="center"
      >
        <Text variant="chipLabel" color={ativo ? 'onPrimary' : 'textMuted'}>
          {o.rotulo}
        </Text>
      </Toque>
    );
  });

  if (expandir) {
    return (
      <Box flexDirection="row" gap="s8">
        {conteudo}
      </Box>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
    >
      {conteudo}
    </ScrollView>
  );
}
