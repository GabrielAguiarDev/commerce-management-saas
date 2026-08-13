import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@components/ui/Avatar';
import { Box } from '@components/ui/Box';
import { Icon } from '@components/ui/Icon';
import { Text } from '@components/ui/Text';
import { Touchable } from '@components/ui/Touchable';
import { useAppTheme } from '@hooks/useAppTheme';
import { useOnTabScreen } from '@hooks/navigation';
import { useSessionStore } from '@store/sessionStore';

import { ConnectionBanner } from './ConnectionBanner';
import { ALTURA_TAB_BAR } from './tabBarGeometry';

/**
 * Altura reservada no fim do conteúdo para a tab bar, a barra do carrinho e o
 * botão "Vender" não cobrirem o último item.
 *
 * Derivado da altura da barra: era um 150 fixo que embutia os 88 de outrora, e
 * encolher a barra sem isto deixaria um rodapé vazio no fim de toda rolagem.
 * Os 62 são a barra do carrinho mais a folga.
 *
 * Vale nas ABAS. Ver `ESPACO_INFERIOR_INTERNO` para as telas de pilha.
 */
export const ESPACO_INFERIOR = ALTURA_TAB_BAR + 62;

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
  /**
   * O ATALHO para a tela em que NADA rola na horizontal: aplica o gutter no
   * conteúdo inteiro de uma vez, em vez de obrigar cada bloco a se envolver
   * num `<Gutter>`.
   *
   * O padrão é `false` de propósito. A tela que tem uma fileira de chips, uma
   * barra de abas ou qualquer coisa que role na horizontal precisa que o
   * conteúdo alcance a borda REAL do aparelho — e a única forma de garantir
   * que ninguém ative isso por hábito e volte a cortar a rolagem é fazer o
   * caso seguro ser o que se escreve.
   *
   * Ver `padding-layout.md` na raiz do app.
   */
  padded?: boolean;
  /**
   * A ROLAGEM CHEGOU PERTO DO FIM — a deixa para carregar a próxima página.
   *
   * Existe para o histórico de vendas, e mora AQUI porque quem rola é o
   * `ScrollView` deste componente: sem esta porta, a tela teria que trocar o
   * `Screen` por um `FlatList` próprio (e um `VirtualizedList` dentro de um
   * `ScrollView` é erro em runtime, não uma questão de gosto).
   *
   * Cabe a quem passa não disparar duas buscas: o evento repete a cada quadro
   * de rolagem dentro da faixa. O padrão é checar `!isFetchingNextPage` antes
   * de pedir a próxima.
   */
  onEndReached?: () => void;
  /** A que distância do fim (px) o aviso dispara. */
  onEndReachedThreshold?: number;
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
  padded = false,
  onEndReached,
  onEndReachedThreshold = 320,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
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

  return (
    <Box flex={1} backgroundColor="bg" style={{ paddingTop: insets.top }}>
      <Box
        flexDirection="row"
        alignItems="center"
        gap="s12"
        // O header é conteúdo estático e usa o MESMO gutter do resto. Era
        // `s18` — 2px a mais que o conteúdo abaixo dele, o que colocava o
        // título fora do prumo do primeiro cartão.
        //
        // ⚠️ Estes dois paddings verticais (e os `lineHeight` do título e do
        // subtítulo) estão espelhados em `headerGeometry.ALTURA_HEADER`, que é
        // por onde o toast sabe onde o header acaba. Mexeu aqui, mexe lá.
        paddingHorizontal="screen"
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
        // SEM rolagem, o padding fica no próprio Box: não há
        // `contentContainerStyle` onde colocá-lo. `flex={1}` é o que dá ao
        // conteúdo — que aqui tem altura própria (a thread do suporte, o
        // navegador de abas de Configurações) — a altura restante da tela.
        <Box flex={1} gap="s12" paddingTop="s2" paddingHorizontal={padded ? 'screen' : undefined}>
          {children}
        </Box>
      ) : (
        // COM rolagem, TODO o padding vai para o `contentContainerStyle` — o
        // horizontal junto do vertical. No `style` do ScrollView o horizontal
        // recortaria a área visível: no dia em que esta tela ganhasse uma
        // fileira que rola na horizontal, ela voltaria a ser cortada antes da
        // borda, que é justamente o defeito que esta divisão corrige. Altura
        // fixa aqui seria o oposto do caso acima: impediria a rolagem.
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: theme.spacing.s2,
            paddingBottom: bottomSpace,
            paddingHorizontal: padded ? theme.spacing.screen : 0,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          // `onScroll` só é ligado quando alguém quer saber — uma tela comum
          // não paga por um callback a cada quadro de rolagem.
          onScroll={
            onEndReached
              ? ({ nativeEvent: e }) => {
                  const distanciaDoFim =
                    e.contentSize.height - e.contentOffset.y - e.layoutMeasurement.height;
                  if (distanciaDoFim <= onEndReachedThreshold) onEndReached();
                }
              : undefined
          }
          // 16ms daria um evento por quadro; 100 é o suficiente para pedir a
          // próxima página bem antes de o usuário alcançar o fim, sem inundar
          // a ponte com eventos durante uma rolagem rápida.
          scrollEventThrottle={onEndReached ? 100 : undefined}
        >
          <Box gap="s12">{children}</Box>
        </ScrollView>
      )}
    </Box>
  );
}
