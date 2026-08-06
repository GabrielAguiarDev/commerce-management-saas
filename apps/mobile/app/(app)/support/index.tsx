import { router } from 'expo-router';

import { Button, Box, Pill, Screen, Text, Touchable } from '@components';
import { useTickets, useMarkAsRead } from '@domain/support';
import type { TicketStatus } from '@domain/support';
import { useUIStore } from '@store/uiStore';
import type { ThemeColor } from '@theme';

const CORES_DO_STATUS: Record<TicketStatus, { fundo: ThemeColor; text: ThemeColor }> = {
  answered: { fundo: 'primarySoft', text: 'primary' },
  in_progress: { fundo: 'warningSoft', text: 'warning' },
  resolved: { fundo: 'successSoft', text: 'success' },
};

export default function SupportScreen() {
  const { data: tickets = [] } = useTickets();
  const { mutate: markAsRead } = useMarkAsRead();
  const openSheet = useUIStore((s) => s.openSheet);

  return (
    <Screen title="Suporte" subtitle="A gente responde por aqui">
      {tickets.map((ticket) => (
        <Touchable
          key={ticket.id}
          accessibilityLabel={`${ticket.assunto}. ${ticket.statusRotulo}${ticket.naoLida ? '. Não lida' : ''}`}
          onPress={() => {
            // Marcar como lido ANTES de navegar: o badge da tela "Mais" precisa
            // apagar mesmo que o usuário volte imediatamente.
            if (ticket.naoLida) markAsRead(ticket.id);
            router.push(`/suporte/${ticket.id}` as never);
          }}
          backgroundColor="surface"
          borderColor="line"
          borderWidth={1}
          borderRadius="r18"
          padding="s15"
          flexDirection="row"
          gap="s12"
          alignItems="flex-start"
        >
          <Box flex={1} minWidth={0}>
            <Text variant="titleXs" lineHeight={19}>
              {ticket.assunto}
            </Text>
            <Text variant="captionSm" color="textMuted" marginTop="s5">
              {ticket.summary}
            </Text>
            <Box marginTop="s9">
              <Pill
                text={ticket.statusRotulo}
                backgroundColor={CORES_DO_STATUS[ticket.status].fundo}
                textColor={CORES_DO_STATUS[ticket.status].text}
                paddingX={10}
                paddingY={4}
              />
            </Box>
          </Box>

          {ticket.naoLida ? (
            <Box width={10} height={10} borderRadius="full" backgroundColor="danger" marginTop="s4" />
          ) : null}
        </Touchable>
      ))}

      <Button
        title="Abrir chamado"
        onPress={() => openSheet({ type: 'ticket' })}
        height={52}
        radius={18}
        textVariant="buttonSm"
      />
    </Screen>
  );
}
