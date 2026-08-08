import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@components/ui/Avatar';
import { Box } from '@components/ui/Box';
import { Icon } from '@components/ui/Icon';
import { Text } from '@components/ui/Text';
import { Touchable } from '@components/ui/Touchable';
import { useOnTabScreen } from '@hooks/navigation';
import { useSessionStore } from '@store/sessionStore';

import { ConnectionBanner } from './ConnectionBanner';

/**
 * Altura reservada no fim do conteúdo para a tab bar (88), a barra do carrinho
 * e o FAB não cobrirem o último item. O protótipo usa 150px de padding-bottom.
 *
 * Vale nas ABAS. Ver `ESPACO_INFERIOR_INTERNO` para as telas de pilha.
 */
export const ESPACO_INFERIOR = 150;

/**
 * O mesmo, nas telas INTERNAS (Vender, Estoque, Configurações, Suporte…), onde
 * a tab bar não sobe: sobra reservar a barra do carrinho (60) mais folga. A
 * safe area entra por cima disto, e não no lugar dela.
 *
 * Sem esta distinção, cada tela interna terminava com ~90px de vazio no fim da
 * rolagem, reservados para uma barra que não está mais lá.
 */
export const ESPACO_INFERIOR_INTERNO = 92;

interface ScreenProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /**
   * Sem rolagem: a thread do suporte rola por conta própria (invertida) e o
   * teclado precisa empurrar o campo de resposta.
   */
  noScroll?: boolean;
  /** Botão voltar. Padrão: aparece quando há para onde voltar na pilha. */
  showBack?: boolean;
}

/**
 * O ESQUELETO de toda tela do app: header, banner de conexão e conteúdo.
 *
 * A chrome não está aqui — a tab bar e o botão Vender vivem no layout de
 * `(tabs)`, a barra do carrinho no de `(app)`. Esta divisão é o que permite ter
 * navegação nativa de verdade (push/pop, gesto de voltar do iOS) com a chrome
 * flutuante que o protótipo desenha, sem transformar cada tela numa aba.
 *
 * O MESMO COMPONENTE serve aba e tela interna, e as duas diferenças visíveis
 * saem daqui sem ninguém precisar passar prop: o botão voltar (que existe
 * quando há pilha) e o espaço reservado no rodapé (que muda conforme a tab bar
 * esteja embaixo ou não).
 */
export function Screen({
  title,
  subtitle,
  children,
  noScroll = false,
  showBack,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const user = useSessionStore((s) => s.user);
  const onTab = useOnTabScreen();

  // `router.canGoBack()` é a fonte da verdade da pilha: replicar isso num
  // estado próprio (como a `pilha` do protótipo) desincroniza na primeira vez
  // que alguém navega por deep link.
  //
  // Nas abas ele é `false` (o `backBehavior="none"` do navegador de abas
  // garante isso), nas telas internas é `true` — então o botão voltar aparece
  // exatamente onde a tab bar não está, sem nenhuma lista de rotas.
  const canGoBack = showBack ?? router.canGoBack();

  const bottomSpace = onTab ? ESPACO_INFERIOR : ESPACO_INFERIOR_INTERNO + insets.bottom;

  // `flex={1}` só no caso SEM rolagem: ali o conteúdo é quem tem altura própria
  // (a thread do suporte, o navegador de abas de Configurações) e precisa
  // receber a altura restante da tela. Dentro do `ScrollView` seria o oposto —
  // altura fixa impediria a rolagem.
  const content = (flexible: boolean) => (
    <Box flex={flexible ? 1 : undefined} gap="s12" paddingHorizontal="s16" paddingTop="s2">
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
        {canGoBack ? (
          <Touchable
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
            <Icon name="back" size={17} />
          </Touchable>
        ) : null}

        <Box flex={1} minWidth={0}>
          <Text variant="screenTitle" accessibilityRole="header">
            {title}
          </Text>
          <Text variant="caption" color="textMuted" marginTop="s3">
            {subtitle}
          </Text>
        </Box>

        <Avatar initials={user?.initials ?? '?'} />
      </Box>

      <ConnectionBanner />

      {noScroll ? (
        content(true)
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: bottomSpace }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content(false)}
        </ScrollView>
      )}
    </Box>
  );
}
