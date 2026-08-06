import { useState } from 'react';
import { Modal } from 'react-native';

import { Box } from './Box';
import { Text } from './Text';
import { Toque } from './Toque';

export interface OpcaoDeSeletor {
  valor: string;
  rotulo: string;
}

interface SeletorProps {
  valor: string;
  opcoes: readonly OpcaoDeSeletor[];
  aoSelecionar: (valor: string) => void;
  rotuloAcessivel: string;
  altura?: number;
}

/**
 * O equivalente ao `<select>` do protótipo.
 *
 * React Native não tem select nativo multiplataforma: no iOS ele é uma roda,
 * no Android um diálogo. Em vez de importar um Picker que fica diferente em
 * cada plataforma (e que não aceita o tema), o campo abre uma lista simples em
 * `Modal` — visualmente igual nos dois lados e usando os mesmos tokens.
 *
 * `Modal` do RN, e não um overlay absoluto, porque este seletor é aberto de
 * DENTRO de um bottom sheet: um overlay comum ficaria embaixo do sheet.
 */
export function Seletor({
  valor,
  opcoes,
  aoSelecionar,
  rotuloAcessivel,
  altura = 52,
}: SeletorProps) {
  const [aberto, setAberto] = useState(false);
  const atual = opcoes.find((o) => o.valor === valor);

  return (
    <>
      <Toque
        accessibilityLabel={`${rotuloAcessivel}: ${atual?.rotulo ?? 'nenhuma'}`}
        accessibilityRole="button"
        onPress={() => setAberto(true)}
        height={altura}
        borderRadius="r15"
        borderWidth={1}
        borderColor="line"
        backgroundColor="surface2"
        paddingHorizontal="s13"
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Text variant="fieldValue">{atual?.rotulo ?? '—'}</Text>
        <Text variant="fieldValue" color="textMuted">
          ⌄
        </Text>
      </Toque>

      <Modal
        visible={aberto}
        transparent
        animationType="fade"
        onRequestClose={() => setAberto(false)}
      >
        <Toque
          accessibilityLabel="Fechar lista"
          onPress={() => setAberto(false)}
          flex={1}
          backgroundColor="scrimDialog"
          justifyContent="center"
          padding="s26"
        >
          <Box backgroundColor="surface" borderRadius="r20" overflow="hidden">
            {opcoes.map((o, indice) => (
              <Toque
                key={o.valor}
                accessibilityLabel={o.rotulo}
                accessibilityState={{ selected: o.valor === valor }}
                onPress={() => {
                  aoSelecionar(o.valor);
                  setAberto(false);
                }}
                paddingVertical="s16"
                paddingHorizontal="s18"
                borderTopWidth={indice === 0 ? 0 : 1}
                borderTopColor="line"
              >
                <Text variant="fieldValue" color={o.valor === valor ? 'primary' : 'textPrimary'}>
                  {o.rotulo}
                </Text>
              </Toque>
            ))}
          </Box>
        </Toque>
      </Modal>
    </>
  );
}
