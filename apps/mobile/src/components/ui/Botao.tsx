import { ActivityIndicator } from 'react-native';

import { useAppTheme } from '@hooks/useAppTheme';
import type { TextVariant, ThemeColor } from '@theme';

import { Box } from './Box';
import { Text } from './Text';
import { Toque } from './Toque';

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
export type VarianteBotao =
  | 'primario'
  | 'destrutivo'
  | 'secundario'
  | 'fantasma'
  | 'tracejado'
  | 'contorno';

interface BotaoProps {
  titulo: string;
  aoTocar: () => void;
  variante?: VarianteBotao;
  /** Altura do design; muda por contexto (46 a 56). */
  altura?: number;
  /** Sobrepõe a cor do texto — usado no "Sair da conta", que é vermelho. */
  corDoTexto?: ThemeColor;
  variantTexto?: TextVariant;
  carregando?: boolean;
  desabilitado?: boolean;
  larguraTotal?: boolean;
  raio?: number;
}

export function Botao({
  titulo,
  aoTocar,
  variante = 'primario',
  altura = 52,
  corDoTexto,
  variantTexto = 'buttonMd',
  carregando = false,
  desabilitado = false,
  larguraTotal = true,
  raio = 16,
}: BotaoProps) {
  const tema = useAppTheme();
  const inativo = desabilitado || carregando;

  const cheio = variante === 'primario' || variante === 'destrutivo';

  const fundo: ThemeColor =
    variante === 'primario'
      ? 'primary'
      : variante === 'destrutivo'
        ? 'danger'
        : variante === 'secundario'
          ? 'surface'
          : 'transparent';

  const borda: ThemeColor | undefined =
    variante === 'secundario' || variante === 'contorno' || variante === 'tracejado'
      ? 'line'
      : undefined;

  const texto: ThemeColor =
    corDoTexto ??
    (cheio
      ? 'onPrimary'
      : variante === 'contorno' || variante === 'tracejado'
        ? 'primary'
        : 'textPrimary');

  return (
    <Toque
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      disabled={inativo}
      onPress={aoTocar}
      backgroundColor={fundo}
      borderColor={borda}
      borderWidth={borda ? (variante === 'tracejado' ? 1.5 : 1) : 0}
      borderStyle={variante === 'tracejado' ? 'dashed' : 'solid'}
      borderRadius={raio as never}
      height={altura}
      width={larguraTotal ? '100%' : undefined}
      paddingHorizontal={larguraTotal ? 's0' : 's18'}
      alignItems="center"
      justifyContent="center"
      flexDirection="row"
      opacity={inativo ? 0.55 : 1}
    >
      {carregando ? (
        <ActivityIndicator color={cheio ? tema.colors.onPrimary : tema.colors.primary} />
      ) : (
        <Box>
          <Text variant={variantTexto} color={texto} textAlign="center">
            {titulo}
          </Text>
        </Box>
      )}
    </Toque>
  );
}
