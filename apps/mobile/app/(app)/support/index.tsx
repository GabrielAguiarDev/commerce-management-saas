import { router } from 'expo-router';
import { Fragment } from 'react';

import { Button, Box, Icon, Pill, Screen, Text, Touchable } from '@components';
import type { IconName } from '@components';
import { ROUTES } from '@domain/navigation/routes';
import { useTickets, useMarkAsRead } from '@domain/support';
import type { Ticket, TicketStatus } from '@domain/support';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';
import type { ThemeColor } from '@theme';

const CORES_DO_STATUS: Record<TicketStatus, { fundo: ThemeColor; text: ThemeColor }> = {
  answered: { fundo: 'primarySoft', text: 'primary' },
  in_progress: { fundo: 'warningSoft', text: 'warning' },
  resolved: { fundo: 'successSoft', text: 'success' },
};

export default function SupportScreen() {
  const t = useTranslation();
  const { data: tickets = [], isPending } = useTickets();
  const { mutate: markAsRead } = useMarkAsRead();
  const openSheet = useUIStore((s) => s.openSheet);

  // Vazio de verdade — e não "ainda carregando", que mostraria o convite por
  // um instante a quem tem chamados.
  const empty = !isPending && tickets.length === 0;

  return (
    <Screen
      title="Suporte"
      subtitle="A gente responde por aqui"
      padded
      // Sem rolagem quando vazio: é o que deixa o convite CENTRALIZADO na
      // altura que sobra entre o header e o botão.
      noScroll={empty}
      // O botão mora na base, fora da rolagem. No fim da lista ele subia para
      // o topo da tela quando não havia chamados, com o resto vazio embaixo.
      footer={
        <Button
          title={t.supportScreen.openTicket}
          onPress={() => openSheet({ type: 'ticket' })}
          height={52}
          radius={18}
          textVariant="buttonSm"
        />
      }
    >
      {empty ? <EmptySupport /> : null}

      {tickets.length > 0 ? <TicketStats tickets={tickets} /> : null}

      {tickets.map((ticket) => (
        <Touchable
          key={ticket.id}
          accessibilityLabel={`${ticket.assunto}. ${ticket.statusRotulo}${ticket.naoLida ? '. Não lida' : ''}`}
          onPress={() => {
            // Marcar como lido ANTES de navegar: o badge da tela "Mais" precisa
            // apagar mesmo que o usuário volte imediatamente.
            if (ticket.naoLida) markAsRead(ticket.id);
            router.push(`${ROUTES.support}/${ticket.id}` as never);
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
    </Screen>
  );
}

/**
 * Sem chamados: o que o suporte É, em três passos desenhados — e quase nada
 * escrito. Quem chega aqui pela primeira vez está com um problema na mão, não
 * com tempo para ler.
 */
function EmptySupport() {
  const t = useTranslation();

  const steps: { icon: IconName; label: string; fundo: ThemeColor; cor: ThemeColor }[] = [
    { icon: 'mail', label: t.supportScreen.steps.open, fundo: 'primarySoft', cor: 'primary' },
    { icon: 'support', label: t.supportScreen.steps.reply, fundo: 'warningSoft', cor: 'warning' },
    { icon: 'check', label: t.supportScreen.steps.solved, fundo: 'successSoft', cor: 'success' },
  ];

  return (
    <Box flex={1} justifyContent="center" alignItems="center" paddingBottom="s28">
      <Box
        width={76}
        height={76}
        borderRadius="full"
        backgroundColor="primarySoft"
        alignItems="center"
        justifyContent="center"
      >
        <Icon name="support" size={34} color="primary" />
      </Box>

      <Text variant="titleSm" marginTop="s16" textAlign="center">
        {t.supportScreen.empty.title}
      </Text>
      <Text variant="bodySm" color="textMuted" marginTop="s6" textAlign="center">
        {t.supportScreen.empty.text}
      </Text>

      {/* Os três passos numa linha, ligados por um traço na altura dos
          círculos: a ordem se lê sem nenhuma seta ou número. */}
      <Box flexDirection="row" alignItems="flex-start" marginTop="s28" alignSelf="stretch">
        {steps.map((step, i) => (
          <Fragment key={step.icon}>
            {i > 0 ? (
              <Box flex={1} height={2} borderRadius="full" backgroundColor="line" marginTop="s20" />
            ) : null}
            <Box alignItems="center" width={88}>
              <Box
                width={42}
                height={42}
                borderRadius="full"
                backgroundColor={step.fundo}
                alignItems="center"
                justifyContent="center"
              >
                <Icon name={step.icon} size={19} color={step.cor} />
              </Box>
              <Text variant="hint" color="textMuted" marginTop="s8" textAlign="center">
                {step.label}
              </Text>
            </Box>
          </Fragment>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Com chamados: quantos estão em cada situação, nas MESMAS cores dos selos da
 * lista abaixo — o resumo e a lista falam a mesma língua.
 */
function TicketStats({ tickets }: { tickets: Ticket[] }) {
  const t = useTranslation();
  const order: TicketStatus[] = ['in_progress', 'answered', 'resolved'];

  return (
    <Box flexDirection="row" gap="s8">
      {order.map((status) => (
        <Box
          key={status}
          flex={1}
          backgroundColor={CORES_DO_STATUS[status].fundo}
          borderRadius="r16"
          paddingVertical="s12"
          paddingHorizontal="s12"
        >
          <Text variant="cardValue" color={CORES_DO_STATUS[status].text}>
            {tickets.filter((ticket) => ticket.status === status).length}
          </Text>
          <Text variant="hint" color={CORES_DO_STATUS[status].text} marginTop="s2" numberOfLines={1}>
            {t.supportScreen.stats[status]}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
