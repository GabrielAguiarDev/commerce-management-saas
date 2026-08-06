import { ScrollView } from 'react-native';

import { Box } from './Box';
import { Text } from './Text';
import { Touchable } from './Touchable';

export interface ChipOption<T extends string> {
  key: T;
  label: string;
}

interface ChipsProps<T extends string> {
  options: readonly ChipOption<T>[];
  selecionada: T;
  onSelect: (key: T) => void;
  /** `pilula` = raio 999 (Produtos/Relatórios); `caixa` = raio 12 (Custos). */
  method?: 'pilula' | 'cash';
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
  options,
  selecionada,
  onSelect,
  method = 'pilula',
  expandir = false,
}: ChipsProps<T>) {
  const content = options.map((o) => {
    const active = o.key === selecionada;
    return (
      <Touchable
        key={o.key}
        accessibilityLabel={o.label}
        accessibilityState={{ selected: active }}
        onPress={() => onSelect(o.key)}
        flex={expandir ? 1 : undefined}
        height={expandir ? 38 : 36}
        paddingHorizontal={expandir ? 's0' : method === 'pilula' ? 's14' : 's13'}
        borderRadius={method === 'pilula' ? 'full' : 'r12'}
        borderWidth={1}
        borderColor={active ? 'primary' : 'line'}
        backgroundColor={active ? 'primary' : 'surface'}
        alignItems="center"
        justifyContent="center"
      >
        <Text variant="chipLabel" color={active ? 'onPrimary' : 'textMuted'}>
          {o.label}
        </Text>
      </Touchable>
    );
  });

  if (expandir) {
    return (
      <Box flexDirection="row" gap="s8">
        {content}
      </Box>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
    >
      {content}
    </ScrollView>
  );
}
