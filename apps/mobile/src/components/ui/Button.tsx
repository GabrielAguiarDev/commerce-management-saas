import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useAppTheme } from '@hooks/useAppTheme';
import { tokenDeRaio, type Raio, type TextVariant, type ThemeColor } from '@theme';

import { Box } from './Box';
import { Text } from './Text';
import { Touchable } from './Touchable';

/**
 * As formas de botão do design, e nada além disso.
 *
 * `primario`   — teal cheio, texto branco. A ação principal da tela.
 * `destrutivo` — vermelho cheio. Só nas confirmações que apagam algo.
 * `secundario` — surface com borda, texto padrão. Ação de apoio.
 * `fantasma`   — sem fundo nem borda. "Cancelar venda", "Agora não".
 * `tracejado`  — borda pontilhada teal. "+ Cadastro rápido".
 * `contorno`   — só borda, texto teal. "Quero mudar meu plano".
 * `gradiente`  — azul em degradê. SÓ nas quatro telas de ENTRADA.
 *
 * O `gradiente` é o único que não usa cor do tema corrente, e é deliberado: ele
 * vive sobre o fundo fixo da entrada, que também não muda com o tema — um
 * `primario` ali sairia num azul com a preferência no claro e noutro com ela no
 * escuro, na mesma tela de cor fixa. Usá-lo numa tela de dentro do app faz o
 * inverso: destoa do resto. Para lá existe o `primario`.
 */
export type ButtonVariant =
  | 'primario'
  | 'destrutivo'
  | 'secundario'
  | 'fantasma'
  | 'tracejado'
  | 'contorno'
  | 'gradiente';

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

  const gradiente = variant === 'gradiente';
  const cheio = variant === 'primario' || variant === 'destrutivo' || gradiente;

  // O degradê é uma CAMADA, não uma cor de fundo: quem pinta é a `LinearGradient`
  // esticada por dentro do botão, e o fundo do próprio botão fica transparente
  // para não aparecer por baixo dela nas bordas arredondadas.
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
      // Sem isto o degradê, que é um filho absoluto de canto a canto, escapa
      // pelos quatro cantos arredondados no Android.
      overflow={gradiente ? 'hidden' : undefined}
    >
      {gradiente ? (
        <LinearGradient
          colors={[theme.colors.ctaTop, theme.colors.ctaBottom]}
          // De cima para baixo, com um desvio à direita: é a mesma inclinação
          // da luz que desce no fundo da tela.
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

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
