import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { useAppTheme } from '@hooks/useAppTheme';
import { fontFamily } from '@theme';

import { Box } from './Box';
import { Text } from './Text';

interface CampoProps extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  valor: string;
  aoMudar: (texto: string) => void;
  rotulo?: string;
  altura?: number;
  raio?: number;
  /** Variante do login: campo translúcido sobre o fundo petrol. */
  sobrePetrol?: boolean;
  alinharADireita?: boolean;
  multilinha?: boolean;
  /** Nó renderizado à direita, dentro do campo (ex.: "Mostrar" da senha). */
  acessorio?: React.ReactNode;
  /** Nó à esquerda (ex.: a lupa da busca). */
  prefixo?: React.ReactNode;
}

/**
 * Campo de texto do design system.
 *
 * `TextInput` não aceita as props de estilo do restyle, então o estilo é
 * montado à mão a partir dos tokens do tema — nunca de literais. A `Box`
 * externa é quem desenha fundo, borda e raio; o input fica transparente por
 * dentro dela. É o que permite encaixar prefixo e acessório sem gambiarra de
 * posicionamento absoluto.
 */
export const Campo = forwardRef<TextInput, CampoProps>(function Campo(
  {
    valor,
    aoMudar,
    rotulo,
    altura = 50,
    raio = 14,
    sobrePetrol = false,
    alinharADireita = false,
    multilinha = false,
    acessorio,
    prefixo,
    ...resto
  },
  ref,
) {
  const tema = useAppTheme();

  return (
    <Box>
      {rotulo ? (
        <Text
          variant={sobrePetrol ? 'label' : 'fieldLabel'}
          color={sobrePetrol ? 'onPetrolMuted' : 'textMuted'}
          marginBottom={sobrePetrol ? 's7' : 's6'}
        >
          {rotulo}
        </Text>
      ) : null}

      <Box
        flexDirection="row"
        alignItems={multilinha ? 'flex-start' : 'center'}
        backgroundColor={sobrePetrol ? 'fieldOnPetrol' : 'surface2'}
        borderColor={sobrePetrol ? 'fieldBorderOnPetrol' : 'line'}
        borderWidth={1}
        borderRadius={raio as never}
        height={multilinha ? undefined : altura}
        minHeight={multilinha ? 110 : undefined}
        paddingHorizontal="s13"
      >
        {prefixo ? <Box marginRight="s10">{prefixo}</Box> : null}

        <TextInput
          ref={ref}
          value={valor}
          onChangeText={aoMudar}
          multiline={multilinha}
          placeholderTextColor={sobrePetrol ? tema.colors.onPetrolGhost : tema.colors.textMuted}
          style={{
            flex: 1,
            color: sobrePetrol ? tema.colors.white : tema.colors.textPrimary,
            fontFamily: sobrePetrol ? fontFamily.medium : fontFamily.semibold,
            fontSize: sobrePetrol ? 15 : 14.5,
            textAlign: alinharADireita ? 'right' : 'left',
            paddingVertical: multilinha ? 12 : 0,
            // Android desenha um padding interno próprio que desalinha o texto
            // em relação ao iOS. Zerar aqui é o que faz os dois baterem.
            paddingHorizontal: 0,
            textAlignVertical: multilinha ? 'top' : 'center',
          }}
          {...resto}
        />

        {acessorio ? <Box marginLeft="s8">{acessorio}</Box> : null}
      </Box>
    </Box>
  );
});
