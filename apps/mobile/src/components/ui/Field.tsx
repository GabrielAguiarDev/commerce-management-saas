import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

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
    alignRight = false,
    multiline = false,
    accessory,
    prefix,
    ...resto
  },
  ref,
) {
  const theme = useAppTheme();

  return (
    <Box>
      {label ? (
        <Text
          variant={onPetrol ? 'label' : 'fieldLabel'}
          color={onPetrol ? 'onPetrolMuted' : 'textMuted'}
          marginBottom={onPetrol ? 's7' : 's6'}
        >
          {label}
        </Text>
      ) : null}

      <Box
        flexDirection="row"
        alignItems={multiline ? 'flex-start' : 'center'}
        backgroundColor={onPetrol ? 'fieldOnPetrol' : 'surface2'}
        borderColor={onPetrol ? 'fieldBorderOnPetrol' : 'line'}
        borderWidth={1}
        borderRadius={tokenDeRaio(radius)}
        height={multiline ? undefined : height}
        minHeight={multiline ? 110 : undefined}
        paddingHorizontal="s13"
      >
        {prefix ? <Box marginRight="s10">{prefix}</Box> : null}

        <TextInput
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
        />

        {accessory ? <Box marginLeft="s8">{accessory}</Box> : null}
      </Box>
    </Box>
  );
});
