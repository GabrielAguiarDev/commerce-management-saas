import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { Box, Campo, ESPACO_INFERIOR, Screen, Text, Toque } from '@components';
import { useMensagensDoChamado, useResponderChamado } from '@domain/support';
import { TOASTS } from '@i18n';
import { useUIStore } from '@store/uiStore';

/**
 * A thread do chamado.
 *
 * `semRolagem` no `Screen`: a lista rola por conta própria e o campo de
 * resposta precisa ficar colado ao teclado. Se o Screen rolasse por fora, o
 * campo subiria junto com o conteúdo e sairia da tela.
 */
export default function TelaDoChamado() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: mensagens = [] } = useMensagensDoChamado(id);
  const { mutate: responder, isPending } = useResponderChamado(id);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const [resposta, setResposta] = useState('');

  function enviar() {
    if (!resposta.trim()) return;
    responder(resposta, {
      onSuccess: () => {
        setResposta('');
        mostrarToast(TOASTS.respostaEnviada);
      },
    });
  }

  return (
    <Screen titulo="Chamado" subtitulo="Resposta em até 1 dia útil" semRolagem>
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
                {m.texto}
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
          // Espaço para a tab bar, que continua visível sobre esta tela.
          style={{ paddingBottom: ESPACO_INFERIOR - 40 }}
        >
          <Box flex={1}>
            <Campo
              valor={resposta}
              aoMudar={setResposta}
              placeholder="Escreva sua resposta"
              altura={50}
              raio={15}
              accessibilityLabel="Escreva sua resposta"
              returnKeyType="send"
              onSubmitEditing={enviar}
            />
          </Box>
          <Toque
            accessibilityLabel="Enviar resposta"
            accessibilityState={{ disabled: isPending }}
            disabled={isPending}
            onPress={enviar}
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
          </Toque>
        </Box>
      </KeyboardAvoidingView>
    </Screen>
  );
}
