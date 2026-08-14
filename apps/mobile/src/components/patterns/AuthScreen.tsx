import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthBackdrop } from '@components/patterns/AuthBackdrop';
import { Box } from '@components/ui/Box';
import { Icon } from '@components/ui/Icon';
import { Logo } from '@components/ui/Logo';
import { Text } from '@components/ui/Text';
import { Touchable } from '@components/ui/Touchable';
import { useTranslation } from '@i18n';

/**
 * O ESQUELETO das telas de ENTRADA — login e as três da recuperação de senha.
 *
 * Existe separado do `Screen` porque as duas famílias não têm nada em comum
 * além de serem telas: o `Screen` desenha header com avatar do usuário, banner
 * de conexão e espaço reservado para a tab bar, e nada disso faz sentido antes
 * de haver usuário. O que estas quatro compartilham é o oposto — fundo claro
 * fixo, conteúdo centrado verticalmente e um título grande.
 *
 * Centralizar o conteúdo com `justifyContent: 'center'` DENTRO do
 * `contentContainerStyle` (e não `flex: 1` no filho) é o que mantém a rolagem
 * funcionando quando o teclado sobe num aparelho baixo: sem espaço, o conteúdo
 * rola; com espaço de sobra, ele fica no meio.
 */
interface AuthScreenProps {
  title: string;
  /** Linha de apoio abaixo do título — o "enviamos um código para…". */
  subtitle?: string;
  children: ReactNode;
  /**
   * Qual das duas telas de entrada esta é.
   *
   * `passo`   — os três passos da recuperação de senha. Fundo claro chapado,
   *             título grande alinhado à esquerda. Cada um é uma etapa de um
   *             fluxo que já começou, e a marca já foi apresentada.
   * `entrada` — o LOGIN. A PRIMEIRA tela do app: ganha o fundo com halo e marca
   *             d'água, a marca inteira centrada e, por consequência, um título
   *             menor e também centrado. É uma abertura, não um formulário.
   *
   * É UMA prop e não quatro (`showBrand`, `centered`, `backdrop`, …) porque as
   * quatro diferenças são a mesma decisão: esta é a porta de entrada. Separadas,
   * a próxima tela de entrada nasceria com metade do tratamento por descuido.
   */
  variant?: 'passo' | 'entrada';
  /**
   * Botão voltar. Padrão: aparece quando há para onde voltar na pilha — a mesma
   * regra do `Screen`.
   *
   * O LOGIN passa `false` explicitamente, e não é redundância: `app/index.tsx`
   * fica embaixo dele na pilha (é a rota de passagem que redirecionou para cá),
   * então `canGoBack()` responde `true` ali para sempre. O voltar levaria à
   * porta da rua, que redireciona de volta para o login — um botão que não sai
   * do lugar.
   */
  showBack?: boolean;
  /**
   * Ancorado na BASE da tela, fora da rolagem — a ação principal quando ela não
   * pertence ao meio do conteúdo. Fica dentro do `KeyboardAvoidingView`, então
   * sobe junto com o teclado em vez de ficar escondido atrás dele.
   */
  footer?: ReactNode;
}

export function AuthScreen({
  title,
  subtitle,
  children,
  variant = 'passo',
  showBack,
  footer,
}: AuthScreenProps) {
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  const entrada = variant === 'entrada';

  // Mesma fonte de verdade do `Screen`: a pilha — a menos que a tela diga o
  // contrário. Ver `showBack`.
  const canGoBack = showBack ?? router.canGoBack();

  return (
    <Box flex={1} backgroundColor="authBase" style={{ paddingTop: insets.top }}>
      {/* Hora, bateria e sinal em PRETO, fixo — não `auto` nem o tema.
          O `_layout` raiz decide o estilo pela preferência do usuário
          (`isDark ? 'light' : 'dark'`), e é a regra certa para o app inteiro,
          onde o fundo acompanha o tema. Aqui não acompanha: estas quatro telas
          são claras SEMPRE, então com a preferência no escuro o relógio sairia
          branco sobre o `authBase` e sumiria.
          O `StatusBar` do React Native empilha por componente montado e
          desempilha ao desmontar, então isto vale só enquanto uma tela de
          entrada estiver em cena — ao entrar no app, o estilo do raiz volta
          sozinho. Não é preciso restaurar nada na saída. */}
      <StatusBar style="dark" />

      {/* Antes de tudo, e fora do fluxo: as três camadas do fundo. Só o LOGIN
          as recebe — nos três passos da recuperação de senha fica o `authBase`
          chapado acima, que é exatamente a cor em que o degradê do login
          termina. Sair do login para "Esqueci minha senha" apaga o clarão e a
          marca d'água, e não troca o chão embaixo dos pés. */}
      {entrada ? <AuthBackdrop /> : null}

      {/* FORA da rolagem, e antes dela: o voltar é do aparelho, não do
          conteúdo. Junto com o miolo centralizado ele descia até o meio da
          tela em telas curtas e saía do campo de visão nas longas — e um
          voltar que muda de lugar conforme a tela deixa de ser um voltar. É a
          mesma posição e o mesmo alvo (38pt) do botão do `Screen`. */}
      {canGoBack ? (
        <Box alignItems="flex-start" paddingHorizontal="s18" paddingTop="s2" paddingBottom="s6">
          <Touchable
            accessibilityLabel={t.auth.forgot.back}
            onPress={() => router.back()}
            width={38}
            height={38}
            borderRadius="r12"
            borderWidth={1}
            borderColor="authBorder"
            backgroundColor="authSurface"
            alignItems="center"
            justifyContent="center"
          >
            <Icon name="back" size={17} color="authInk" />
          </Touchable>
        </Box>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 28,
            paddingTop: 20,
            // Com rodapé, a folga de baixo é DELE: somar as duas deixaria o
            // conteúdo centralizado alto demais, empurrado por um espaço que
            // já está ocupado.
            paddingBottom: footer ? 20 : insets.bottom + 40,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {entrada ? <Brand tagline={t.auth.tagline} /> : null}

          <Text
            variant={entrada ? 'authWelcome' : 'authTitle'}
            color="authInk"
            textAlign={entrada ? 'center' : 'left'}
            accessibilityRole="header"
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              variant="bodyLoose"
              color="authMuted"
              textAlign={entrada ? 'center' : 'left'}
              marginTop={entrada ? 's6' : 's10'}
            >
              {subtitle}
            </Text>
          ) : null}

          <Box marginTop={entrada ? 's28' : 's30'}>{children}</Box>
        </ScrollView>

        {footer ? (
          <Box
            paddingHorizontal="s28"
            paddingTop="s12"
            style={{ paddingBottom: insets.bottom + 20 }}
          >
            {footer}
          </Box>
        ) : null}
      </KeyboardAvoidingView>
    </Box>
  );
}

/**
 * A MARCA, empilhada e centrada: o "A" sobre "Aguiar One" sobre a assinatura.
 *
 * "One" sai em azul e "Aguiar" em branco DENTRO do mesmo `Text`, e não em dois
 * lado a lado numa linha: assim as duas palavras compartilham a linha de base e
 * o espaço entre elas é o da própria fonte. Em duas caixas, o `gap` teria de
 * imitar um espaço — e erraria por um fio em cada tamanho de tela.
 *
 * O nome inteiro vai no `accessibilityLabel` porque o leitor de tela anuncia os
 * trechos separados: sem ele, sai "Aguiar" e depois "One", como duas coisas.
 */
function Brand({ tagline }: { tagline: string }) {
  return (
    <Box alignItems="center" marginBottom="s38">
      {/* 72 e não 92: o "A" é a marca, mas quem nomeia o app é a palavra logo
          abaixo. Maior que ~3,5× a altura das maiúsculas do letreiro, o símbolo
          passa a ser o assunto do topo e o nome vira legenda dele. */}
      <Logo size={72} />

      <Text
        variant="brandWordmark"
        color="authInk"
        textAlign="center"
        marginTop="s16"
        accessibilityLabel="Aguiar One"
      >
        Aguiar <Text variant="brandWordmark" color="authBrand">One</Text>
      </Text>

      <Text variant="captionSm" color="authMuted" textAlign="center" marginTop="s12">
        {tagline}
      </Text>
    </Box>
  );
}
