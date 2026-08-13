import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box, Field, ESPACO_INFERIOR_INTERNO, Screen, Text, Touchable } from '@components';
import { useTicketMessages, useReplyToTicket } from '@domain/support';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';

/**
 * A thread do chamado.
 *
 * `semRolagem` no `Screen`: a lista rola por conta própria e o campo de
 * resposta precisa ficar colado ao teclado. Se o Screen rolasse por fora, o
 * campo subiria junto com o conteúdo e sairia da tela.
 */
export default function TicketScreen() {
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: mensagens = [] } = useTicketMessages(id);
  const { mutate: reply, isPending } = useReplyToTicket(id);
  const showToast = useUIStore((s) => s.showToast);

  const [resposta, setResposta] = useState('');

  function send() {
    if (!resposta.trim()) return;
    reply(resposta, {
      onSuccess: () => {
        setResposta('');
        showToast(t.toasts.replySent);
      },
    });
  }

  return (
    <Screen title="Chamado" subtitle="Resposta em até 1 dia útil" noScroll padded>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={12}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
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
          gap="s8"
          paddingTop="s6"
          // Esta é uma tela INTERNA: não há tab bar embaixo, mas a barra do
          // carrinho pode aparecer aqui (o balconista consulta um chamado no
          // meio de uma venda), e ela cobriria o campo de resposta.
          style={{ paddingBottom: ESPACO_INFERIOR_INTERNO + insets.bottom }}
        >
          <Box flex={1}>
            <Field
              value={resposta}
              onChangeText={setResposta}
              placeholder="Escreva sua resposta"
              height={50}
              radius={15}
              accessibilityLabel="Escreva sua resposta"
              returnKeyType="send"
              onSubmitEditing={send}
            />
          </Box>
          <Touchable
            accessibilityLabel="Enviar resposta"
            accessibilityState={{ disabled: isPending }}
            disabled={isPending}
            onPress={send}
            width={50}
            height={50}
            borderRadius="r15"
            backgroundColor="primary"
            alignItems="center"
            justifyContent="center"
          >
            <Text variant="gridPlus" color="onPrimary">
              →
            </Text>
          </Touchable>
        </Box>
      </KeyboardAvoidingView>
    </Screen>
  );
}
