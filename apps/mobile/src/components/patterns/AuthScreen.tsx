import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@components/ui/Box';
import { Icon } from '@components/ui/Icon';
import { Text } from '@components/ui/Text';
import { Touchable } from '@components/ui/Touchable';
import { useTranslation } from '@i18n';

/**
 * O ESQUELETO das telas de ENTRADA — login e as três da recuperação de senha.
 *
 * Existe separado do `Screen` porque as duas famílias não têm nada em comum
 * além de serem telas: o `Screen` desenha header com avatar do usuário, banner
 * de conexão e espaço reservado para a tab bar, e nada disso faz sentido antes
 * de haver usuário. O que estas quatro compartilham é o oposto — fundo petrol,
 * conteúdo centrado verticalmente e um título grande.
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
  /** A marca acima do título. Só o login mostra: é a primeira tela do app. */
  showBrand?: boolean;
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
  showBrand = false,
  showBack,
  footer,
}: AuthScreenProps) {
  const t = useTranslation();
  const insets = useSafeAreaInsets();

  // Mesma fonte de verdade do `Screen`: a pilha — a menos que a tela diga o
  // contrário. Ver `showBack`.
  const canGoBack = showBack ?? router.canGoBack();

  return (
    <Box flex={1} backgroundColor="petrol" style={{ paddingTop: insets.top }}>
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
            borderColor="fieldBorderOnPetrol"
            backgroundColor="fieldOnPetrol"
            alignItems="center"
            justifyContent="center"
          >
            <Icon name="back" size={17} color="white" />
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
          {showBrand ? <Brand tagline={t.auth.tagline} /> : null}

          <Text variant="authTitle" color="white" accessibilityRole="header">
            {title}
          </Text>

          {subtitle ? (
            <Text variant="bodyLoose" color="onPetrolFaint" marginTop="s10">
              {subtitle}
            </Text>
          ) : null}

          <Box marginTop="s30">{children}</Box>
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
 * A marca. É o mesmo bloco que a `StartupLoading` repete depois do login — o
 * elemento que continua na tela faz a espera parecer a continuação da entrada,
 * e não um app diferente abrindo.
 */
function Brand({ tagline }: { tagline: string }) {
  return (
    <Box flexDirection="row" alignItems="center" gap="s11" marginBottom="s34">
      <Box
        width={44}
        height={44}
        borderRadius="r14"
        backgroundColor="primary"
        alignItems="center"
        justifyContent="center"
      >
        <Text variant="logoLetter" color="white">
          A
        </Text>
      </Box>
      <Box>
        <Text variant="brandTitle" color="white">
          Aguiar One
        </Text>
        <Text variant="captionSm" color="onPetrolFaint" marginTop="s4">
          {tagline}
        </Text>
      </Box>
    </Box>
  );
}
