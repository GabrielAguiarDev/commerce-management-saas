import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box, Icon, Screen, Text, Touchable } from '@components';
import {
  attachmentName,
  isStoragePath,
  openAttachment,
  useTicketMessages,
  useReplyToTicket,
} from '@domain/support';
import { useAppTheme } from '@hooks/useAppTheme';
import { useRefreshControl } from '@hooks/usePullToRefresh';
import { useTranslation } from '@i18n';
import { fontFamily } from '@theme';
import { useUIStore } from '@store/uiStore';

/**
 * A thread do chamado.
 *
 * `noScroll` no `Screen`: a lista rola por conta própria e o campo de
 * resposta precisa ficar colado ao teclado. Se o Screen rolasse por fora, o
 * campo subiria junto com o conteúdo e sairia da tela.
 *
 * A BARRA DE RESPOSTA é a de um app de conversa: de borda a borda, colada no
 * rodapé (só a safe area embaixo) e, com o teclado aberto, colada nele. Ela
 * já teve `ESPACO_INFERIOR_INTERNO` embaixo — a folga das telas que rolam —, e
 * isso deixava o campo flutuando ~90px acima do rodapé e do teclado.
 */
export default function TicketScreen() {
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { open: keyboardOpen, height: keyboardHeight } = useKeyboard();
  const listRef = useRef<ScrollView>(null);
  // A conversa rola por conta própria (o `Screen` é `noScroll`): puxar para
  // baixo aqui traz a resposta do suporte sem sair e voltar da tela.
  const refreshControl = useRefreshControl();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: mensagens = [] } = useTicketMessages(id);
  const { mutate: reply, isPending } = useReplyToTicket(id);
  const showToast = useUIStore((s) => s.showToast);

  const [resposta, setResposta] = useState('');
  const canSend = resposta.trim().length > 0 && !isPending;

  // A conversa abre na mensagem mais recente, e volta para ela quando chega
  // uma nova ou o teclado abre por cima — é o que qualquer chat faz.
  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [mensagens.length, keyboardOpen]);

  function send() {
    if (!resposta.trim()) return;
    reply(resposta, {
      onSuccess: () => {
        setResposta('');
        showToast(t.toasts.replySent, { tone: 'sucesso' });
      },
    });
  }

  return (
    // Sem `padded`: a lista leva o gutter por dentro e a barra de resposta vai
    // de borda a borda, como nos apps de conversa.
    <Screen title={t.support.ticketTitle} subtitle={t.support.ticketSubtitle} noScroll>
      {/* No iOS o teclado cobre a janela, e o espaço dele entra aqui embaixo.
          A barra termina exatamente no fim da tela, então a conta é só a
          altura do teclado. O `KeyboardAvoidingView` que havia aqui mede a
          própria posição em relação ao pai — que começa abaixo do header — e
          errava a sobreposição por essa altura; a folga de 92px embaixo
          escondia o erro. No Android a janela já encolhe sozinha. */}
      <Box flex={1} style={{ paddingBottom: Platform.OS === 'ios' ? keyboardHeight : 0 }}>
        <ScrollView
          ref={listRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            gap: 12,
            paddingHorizontal: theme.spacing.screen,
            paddingBottom: theme.spacing.s14,
          }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {mensagens.map((m) => (
            <Box
              key={m.id}
              maxWidth="84%"
              alignSelf={m.minha ? 'flex-end' : 'flex-start'}
              backgroundColor={m.minha ? 'primary' : 'surface'}
              borderTopLeftRadius="r18"
              borderTopRightRadius="r18"
              // O canto "mordido" do lado de quem falou, como no design.
              borderBottomLeftRadius={m.minha ? 'r18' : 'r6'}
              borderBottomRightRadius={m.minha ? 'r6' : 'r18'}
              paddingVertical="s13"
              paddingHorizontal="s15"
            >
              <Text variant="bodyRelaxed" color={m.minha ? 'onPrimary' : 'textPrimary'}>
                {m.text}
              </Text>
              {/* O anexo é um TOQUE, e não um link: o bucket é privado e a
                  URL assinada só passa a existir na hora — ver
                  `supportAttachment.openAttachment`. */}
              {m.anexo !== '' && isStoragePath(m.anexo) && (
                <Touchable
                  accessibilityLabel={t.support.openAttachment(attachmentName(m.anexo))}
                  onPress={async () => {
                    const abriu = await openAttachment(m.anexo);
                    if (!abriu) showToast(t.toasts.attachmentOpenFailed, { tone: 'erro' });
                  }}
                  marginTop="s8"
                  paddingVertical="s6"
                  paddingHorizontal="s10"
                  borderRadius="r10"
                  borderWidth={1}
                  borderColor={m.minha ? 'onPrimary' : 'line'}
                >
                  <Text variant="hint" color={m.minha ? 'onPrimary' : 'textPrimary'}>
                    {attachmentName(m.anexo)}
                  </Text>
                </Touchable>
              )}

              <Text
                variant="micro"
                color={m.minha ? 'onPrimary' : 'textPrimary'}
                opacity={0.6}
                marginTop="s6"
              >
                {m.quando}
              </Text>
            </Box>
          ))}
        </ScrollView>

        <Box
          flexDirection="row"
          alignItems="flex-end"
          gap="s8"
          backgroundColor="surface"
          borderTopWidth={1}
          borderTopColor="line"
          paddingHorizontal="screen"
          paddingTop="s8"
          // Com o teclado aberto a barra encosta nele; fechado, só a safe area
          // do aparelho (a barra de gestos do iPhone) — nunca os dois somados.
          style={{ paddingBottom: keyboardOpen ? theme.spacing.s8 : Math.max(insets.bottom, 8) }}
        >
          <Box
            flex={1}
            minHeight={COMPOSER_HEIGHT}
            justifyContent="center"
            borderRadius="full"
            borderWidth={1}
            borderColor="line"
            backgroundColor="surface2"
            paddingHorizontal="s15"
          >
            <TextInput
              value={resposta}
              onChangeText={setResposta}
              placeholder={t.support.replyPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel={t.support.replyPlaceholder}
              // Cresce com o texto até umas cinco linhas; daí rola por dentro.
              multiline
              style={{
                maxHeight: 112,
                paddingTop: 10,
                paddingBottom: 10,
                paddingHorizontal: 0,
                color: theme.colors.textPrimary,
                fontFamily: fontFamily.medium,
                fontSize: 15,
                lineHeight: 20,
              }}
            />
          </Box>
          <Touchable
            accessibilityLabel={t.support.sendReply}
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={send}
            width={COMPOSER_HEIGHT}
            height={COMPOSER_HEIGHT}
            borderRadius="full"
            // Vazio, o botão apaga: dá para ver de longe que não há o que mandar.
            backgroundColor={canSend ? 'primary' : 'primarySoft'}
            alignItems="center"
            justifyContent="center"
          >
            <Icon name="send" size={20} color={canSend ? 'onPrimary' : 'primary'} />
          </Touchable>
        </Box>
      </Box>
    </Screen>
  );
}

/** Altura do campo com uma linha — e o diâmetro do botão de enviar. */
const COMPOSER_HEIGHT = 44;

/**
 * O teclado: se está na tela e quanto ele ocupa.
 *
 * No iOS escuta o `will` e anima o layout na mesma curva do teclado — a barra
 * sobe junto com ele, e não um quadro depois. No Android só existe o `did`.
 */
function useKeyboard(): { open: boolean; height: number } {
  const [state, setState] = useState({ open: false, height: 0 });

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const animate = (duration?: number) => {
      if (ios && duration) {
        LayoutAnimation.configureNext({
          duration,
          update: { type: LayoutAnimation.Types.keyboard },
        });
      }
    };

    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      animate(e.duration);
      setState({ open: true, height: e.endCoordinates.height });
    });
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', (e) => {
      animate(e.duration);
      setState({ open: false, height: 0 });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return state;
}
