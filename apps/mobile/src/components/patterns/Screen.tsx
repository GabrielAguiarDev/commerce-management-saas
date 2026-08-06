import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@components/ui/Avatar';
import { Box } from '@components/ui/Box';
import { Icone } from '@components/ui/Icone';
import { Text } from '@components/ui/Text';
import { Toque } from '@components/ui/Toque';
import { useSessaoStore } from '@store/sessaoStore';

import { BannerDeConexao } from './BannerDeConexao';

/**
 * Altura reservada no fim do conteúdo para a tab bar (88), a barra do carrinho
 * e o FAB não cobrirem o último item. O protótipo usa 150px de padding-bottom.
 */
export const ESPACO_INFERIOR = 150;

interface ScreenProps {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
  /**
   * Sem rolagem: a thread do suporte rola por conta própria (invertida) e o
   * teclado precisa empurrar o campo de resposta.
   */
  semRolagem?: boolean;
  /** Botão voltar. Padrão: aparece quando há para onde voltar na pilha. */
  mostrarVoltar?: boolean;
}

/**
 * O ESQUELETO de toda tela do app: header, banner de conexão e conteúdo.
 *
 * A tab bar, o FAB e a barra do carrinho NÃO estão aqui — vivem no layout do
 * grupo `(app)`, sobrepostos à pilha inteira. Foi essa divisão que permitiu ter
 * navegação nativa de verdade (push/pop, gesto de voltar do iOS) com a chrome
 * fixa que o protótipo desenha, sem transformar cada tela numa aba.
 */
export function Screen({
  titulo,
  subtitulo,
  children,
  semRolagem = false,
  mostrarVoltar,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const usuario = useSessaoStore((s) => s.usuario);

  // `router.canGoBack()` é a fonte da verdade da pilha: replicar isso num
  // estado próprio (como a `pilha` do protótipo) desincroniza na primeira vez
  // que alguém navega por deep link.
  const podeVoltar = mostrarVoltar ?? router.canGoBack();

  const conteudo = (
    <Box gap="s12" paddingHorizontal="s16" paddingTop="s2">
      {children}
    </Box>
  );

  return (
    <Box flex={1} backgroundColor="bg" style={{ paddingTop: insets.top }}>
      <Box
        flexDirection="row"
        alignItems="center"
        gap="s12"
        paddingHorizontal="s18"
        paddingTop="s2"
        paddingBottom="s12"
      >
        {podeVoltar ? (
          <Toque
            accessibilityLabel="Voltar"
            onPress={() => router.back()}
            width={38}
            height={38}
            borderRadius="r12"
            borderWidth={1}
            borderColor="line"
            backgroundColor="surface"
            alignItems="center"
            justifyContent="center"
          >
            <Icone nome="voltar" tamanho={17} />
          </Toque>
        ) : null}

        <Box flex={1} minWidth={0}>
          <Text variant="screenTitle" accessibilityRole="header">
            {titulo}
          </Text>
          <Text variant="caption" color="textMuted" marginTop="s3">
            {subtitulo}
          </Text>
        </Box>

        <Avatar iniciais={usuario?.iniciais ?? '?'} />
      </Box>

      <BannerDeConexao />

      {semRolagem ? (
        <Box flex={1}>{conteudo}</Box>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: ESPACO_INFERIOR }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {conteudo}
        </ScrollView>
      )}
    </Box>
  );
}
