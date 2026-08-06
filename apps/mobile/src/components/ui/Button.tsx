import { ActivityIndicator } from 'react-native';

import { useAppTheme } from '@hooks/useAppTheme';
import { tokenDeRaio, type Raio, type TextVariant, type ThemeColor } from '@theme';

import { Box } from './Box';
import { Text } from './Text';
import { Touchable } from './Touchable';

/**
 * As cinco formas de botão do design, e nada além disso.
 *
 * `primario`   — teal cheio, texto branco. A ação principal da tela.
 * `destrutivo` — vermelho cheio. Só nas confirmações que apagam algo.
 * `secundario` — surface com borda, texto padrão. Ação de apoio.
 * `fantasma`   — sem fundo nem borda. "Cancelar venda", "Agora não".
 * `tracejado`  — borda pontilhada teal. "+ Cadastro rápido".
 * `contorno`   — só borda, texto teal. "Quero mudar meu plano".
 */
export type ButtonVariant =
  | 'primario'
  | 'destrutivo'
  | 'secundario'
  | 'fantasma'
  | 'tracejado'
  | 'contorno';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Altura do design; muda por contexto (46 a 56). */
  height?: number;
  /** Sobrepõe a cor do texto — usado no "Sair da conta", que é vermelho. */
  textColor?: ThemeColor;
  textVariant?: TextVariant;
  loading?: boolean;
  disabled?: boolean;
  larguraTotal?: boolean;
  radius?: Raio;
}

export function Button({
  title,
  onPress,
  variant = 'primario',
  height = 52,
  textColor,
  textVariant = 'buttonMd',
  loading = false,
  disabled = false,
  larguraTotal = true,
  radius = 16,
}: ButtonProps) {
  const theme = useAppTheme();
  const inactive = disabled || loading;

  const cheio = variant === 'primario' || variant === 'destrutivo';

  const fundo: ThemeColor =
    variant === 'primario'
      ? 'primary'
      : variant === 'destrutivo'
        ? 'danger'
        : variant === 'secundario'
          ? 'surface'
          : 'transparent';

  const borda: ThemeColor | undefined =
    variant === 'secundario' || variant === 'contorno' || variant === 'tracejado'
      ? 'line'
      : undefined;

  const text: ThemeColor =
    textColor ??
    (cheio
      ? 'onPrimary'
      : variant === 'contorno' || variant === 'tracejado'
        ? 'primary'
        : 'textPrimary');

  return (
    <Touchable
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      backgroundColor={fundo}
      borderColor={borda}
      borderWidth={borda ? (variant === 'tracejado' ? 1.5 : 1) : 0}
      borderStyle={variant === 'tracejado' ? 'dashed' : 'solid'}
      borderRadius={tokenDeRaio(radius)}
      height={height}
      width={larguraTotal ? '100%' : undefined}
      paddingHorizontal={larguraTotal ? 's0' : 's18'}
      alignItems="center"
      justifyContent="center"
      flexDirection="row"
      opacity={inactive ? 0.55 : 1}
    >
      {loading ? (
        <ActivityIndicator color={cheio ? theme.colors.onPrimary : theme.colors.primary} />
      ) : (
        <Box>
          <Text variant={textVariant} color={text} textAlign="center">
            {title}
          </Text>
        </Box>
      )}
    </Touchable>
  );
}
