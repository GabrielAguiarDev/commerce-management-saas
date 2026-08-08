import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { useIsInsideSheet } from '@components/patterns/sheetContext';
import { useAppTheme } from '@hooks/useAppTheme';
import { fontFamily, tokenDeRaio, type Raio } from '@theme';

import { Box } from './Box';
import { Text } from './Text';

interface FieldProps extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  height?: number;
  radius?: Raio;
  /** Variante do login: campo translúcido sobre o fundo petrol. */
  onPetrol?: boolean;
  /**
   * A borda acende em teal enquanto o campo tem foco.
   *
   * Opcional, e não o padrão, de propósito: nas telas de dentro do app quase
   * todo formulário mora dentro de um card ou de um sheet, onde o próprio
   * teclado e o contexto já dizem onde se está digitando. Nas telas de entrada
   * o campo está sozinho no meio de um fundo escuro, e o foco precisa aparecer.
   */
  highlightOnFocus?: boolean;
  alignRight?: boolean;
  multiline?: boolean;
  /** Nó renderizado à direita, dentro do campo (ex.: "Mostrar" da senha). */
  accessory?: React.ReactNode;
  /** Nó à esquerda (ex.: a lupa da busca). */
  prefix?: React.ReactNode;
}

/**
 * Campo de texto do design system.
 *
 * `TextInput` não aceita as props de estilo do restyle, então o estilo é
 * montado à mão a partir dos tokens do tema — nunca de literais. A `Box`
 * externa é quem desenha fundo, borda e raio; o input fica transparente por
 * dentro dela. É o que permite encaixar prefix e acessório sem gambiarra de
 * posicionamento absoluto.
 */
export const Field = forwardRef<TextInput, FieldProps>(function Field(
  {
    value,
    onChangeText,
    label,
    height = 50,
    radius = 14,
    onPetrol = false,
    highlightOnFocus = false,
    alignRight = false,
    multiline = false,
    accessory,
    prefix,
    ...resto
  },
  ref,
) {
  const theme = useAppTheme();

  // O foco só é OBSERVADO com `highlightOnFocus`, mas o estado mora aqui de
  // qualquer jeito: `onFocus`/`onBlur` de quem chama continuam sendo chamados
  // nos dois casos, então o comportamento externo do campo não muda.
  const [focused, setFocused] = useState(false);

  // Os tipos do evento saem das PRÓPRIAS props do `TextInput`: o React Native
  // já trocou o formato deles (`NativeSyntheticEvent<TextInputFocusEventData>`
  // virou `FocusEvent`/`BlurEvent` na 0.86), e derivar em vez de escrever o
  // nome faz esta ponte sobreviver à próxima troca.
  const handleFocus: NonNullable<TextInputProps['onFocus']> = (e) => {
    setFocused(true);
    resto.onFocus?.(e);
  };

  const handleBlur: NonNullable<TextInputProps['onBlur']> = (e) => {
    setFocused(false);
    resto.onBlur?.(e);
  };

  const aceso = highlightOnFocus && focused;

  // Dentro de um bottom sheet o input tem que ser o da lib: é ele que avisa o
  // sheet de que o foco entrou em um campo, para o sheet subir com o teclado
  // em vez de ficar escondido atrás dele. O cast existe porque o
  // `BottomSheetTextInput` tipa a ref com o `TextInput` do gesture-handler,
  // que é o mesmo componente com outro caminho de importação.
  const Input = (useIsInsideSheet() ? BottomSheetTextInput : TextInput) as typeof TextInput;

  return (
    <Box>
      {label ? (
        <Text
          // O rótulo ACIMA do campo, e não entalhado na borda: o entalhe exige
          // um retângulo com o fundo da tela cobrindo a linha, e esse retângulo
          // interrompe a borda arredondada — o campo perde o desenho fechado
          // que é a identidade dele no app inteiro.
          variant={onPetrol ? 'label' : 'fieldLabel'}
          color={aceso ? 'primary' : onPetrol ? 'onPetrolMuted' : 'textMuted'}
          marginBottom={onPetrol ? 's7' : 's6'}
        >
          {label}
        </Text>
      ) : null}

      <Box
        flexDirection="row"
        alignItems={multiline ? 'flex-start' : 'center'}
        backgroundColor={onPetrol ? 'fieldOnPetrol' : 'surface2'}
        borderColor={aceso ? 'primary' : onPetrol ? 'fieldBorderOnPetrol' : 'line'}
        borderWidth={1}
        borderRadius={tokenDeRaio(radius)}
        height={multiline ? undefined : height}
        minHeight={multiline ? 110 : undefined}
        paddingHorizontal="s13"
      >
        {prefix ? <Box marginRight="s10">{prefix}</Box> : null}

        <Input
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          placeholderTextColor={onPetrol ? theme.colors.onPetrolGhost : theme.colors.textMuted}
          style={{
            flex: 1,
            color: onPetrol ? theme.colors.white : theme.colors.textPrimary,
            fontFamily: onPetrol ? fontFamily.medium : fontFamily.semibold,
            fontSize: onPetrol ? 15 : 14.5,
            textAlign: alignRight ? 'right' : 'left',
            paddingVertical: multiline ? 12 : 0,
            // Android desenha um padding interno próprio que desalinha o texto
            // em relação ao iOS. Zerar aqui é o que faz os dois baterem.
            paddingHorizontal: 0,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
          {...resto}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {accessory ? <Box marginLeft="s8">{accessory}</Box> : null}
      </Box>
    </Box>
  );
});
