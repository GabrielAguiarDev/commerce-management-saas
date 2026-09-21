import { Button, Box, Card, Divider, Icon, Pill, Screen, Skeleton, Text } from '@components';
import {
  CashError,
  labelDifference,
  useAbrirCaixa,
  useCashHistory,
  useOpenShift,
} from '@domain/cash';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { formatBRL } from '@utils/money';

/**
 * Caixa: dois estados numa rota só, como no protótipo.
 *
 * Fechado → convite para abrir + histórico de turnos.
 * Aberto  → card petrol com a gaveta, recebido por forma e as três ações.
 *
 * Manter numa rota só (e não `/cash` + `/cash/aberto`) é fiel ao produto: o
 * dono pensa "o caixa", não "duas telas". Abrir o caixa não deve empurrar
 * ninguém para outra rota nem colocar um botão voltar no meio do turno.
 */
export default function CashScreen() {
  const t = useTranslation();
  const { data: shift, isPending } = useOpenShift();
  const { data: history = [] } = useCashHistory();
  const { mutate: openCash, isPending: abrindo } = useAbrirCaixa();
  const openSheet = useUIStore((s) => s.openSheet);
  const showToast = useUIStore((s) => s.showToast);

  const subtitle = shift ? t.cash.subtitleOpen : t.cash.subtitleClosed;

  // Enquanto não se sabe se o caixa está aberto, o ESQUELETO ocupa o lugar —
  // e não o vazio de antes. Alternar de "fechado" para "aberto" depois de
  // renderizar seria um salto visual feio bem no meio do turno; sumir com o
  // corpo da tela é pior ainda, porque some junto a sensação de que o app
  // respondeu. Header e tab bar continuam desenhados ao redor: quem espera vê
  // a navegação inteira, só sem o número.
  if (isPending) {
    return (
      <Screen title={t.cash.title} subtitle={subtitle} padded>
        <Skeleton height={128} borderRadius="r22" />
        <Skeleton height={168} borderRadius="r20" />
        <Skeleton height={52} borderRadius="r16" />
      </Screen>
    );
  }

  if (!shift) {
    return (
      <Screen title={t.cash.title} subtitle={subtitle} padded>
        <Card borderRadius="r22" padding="s22" alignItems="center">
          <Box
            width={62}
            height={62}
            borderRadius="r20"
            backgroundColor="surface2"
            alignItems="center"
            justifyContent="center"
            marginBottom="s14"
          >
            <Icon name="cash" size={26} color="textMuted" />
          </Box>
          <Text variant="titleMd">{t.cash.closedTitle}</Text>
          <Text
            variant="bodySm"
            color="textMuted"
            textAlign="center"
            marginTop="s8"
            marginBottom="s18"
          >
            {t.cash.closedText}
          </Text>
          <Button
            title={t.cash.open}
            onPress={() =>
              openCash(undefined, {
                onSuccess: () => showToast(t.toasts.cashOpened, { tone: 'sucesso' }),
                // Sem isto a falha era muda: o botão parava de girar e nada
                // acontecia. Módulo retirado não passa por aqui como código
                // de caixa — o handler global (`AppProviders`) avisa por cima
                // e tira o Caixa da navegação.
                onError: (error) => {
                  const code = error instanceof CashError ? error.code : 'unknown';
                  showToast(t.errors.cash[code], { tone: 'erro' });
                },
              })
            }
            loading={abrindo}
            height={52}
          />
        </Card>

        <Text variant="sectionLabel" color="textMuted" marginTop="s6">
          {t.cash.previousShifts}
        </Text>

        {history.map((turno) => {
          const diferenca = labelDifference(turno.diferencaCentavos, formatBRL);
          return (
            <Box
              key={turno.id}
              backgroundColor="surface"
              borderColor="line"
              borderWidth={1}
              borderRadius="r18"
              padding="s14"
              flexDirection="row"
              alignItems="center"
              gap="s12"
            >
              <Box flex={1}>
                <Text variant="titleXs">{turno.dateLabel}</Text>
                <Text variant="captionSm" color="textMuted" marginTop="s3">
                  {turno.periodLabel}
                </Text>
              </Box>
              <Box alignItems="flex-end">
                <Text variant="titleXs">{formatBRL(turno.totalCents)}</Text>
                <Text
                  variant="hint"
                  color={diferenca.tone === 'neutral' ? 'success' : 'warning'}
                  marginTop="s3"
                >
                  {diferenca.text}
                </Text>
              </Box>
            </Box>
          );
        })}
      </Screen>
    );
  }

  return (
    <Screen title={t.cash.title} subtitle={subtitle} padded>
      <Box backgroundColor="petrol" borderRadius="r22" padding="s20">
        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
          <Text variant="chipLabel" color="onPetrol" opacity={0.7}>
            {t.cash.drawerNow}
          </Text>
          <Pill
            text={t.cash.openedAt(shift.openedAt)}
            backgroundColor="shiftPillBg"
            textColor="shiftPillFg"
            paddingX={10}
            paddingY={5}
          />
        </Box>
        <Text variant="displayValue" color="onPetrol" marginTop="s8" marginBottom="s4">
          {formatBRL(shift.gavetaCentavos)}
        </Text>
        <Text variant="chipLabel" color="onPetrol" opacity={0.65}>
          {t.cash.drawerBreakdown(formatBRL(shift.aberturaCentavos), formatBRL(shift.cashSalesCents))}
        </Text>
      </Box>

      <Card paddingVertical="s6" paddingHorizontal="s16">
        <Text variant="sectionTitle" paddingTop="s13" paddingBottom="s4">
          {t.cash.receivedInShift}
        </Text>
        {shift.receipts.map((r) => (
          <Box key={r.method}>
            <Divider />
            <Box flexDirection="row" alignItems="center" gap="s10" paddingVertical="s11">
              <Box flex={1}>
                <Text variant="rowLabel">{r.label}</Text>
              </Box>
              <Text variant="titleXs">{formatBRL(r.amountCents)}</Text>
            </Box>
          </Box>
        ))}
      </Card>

      <Box flexDirection="row" gap="s10">
        <Box flex={1}>
          <Button
            title={t.cash.withdrawal}
            onPress={() => openSheet({ type: 'withdrawal' })}
            variant="secundario"
            height={52}
            textVariant="buttonXs"
          />
        </Box>
        <Box flex={1}>
          <Button
            title={t.cash.topUp}
            onPress={() => openSheet({ type: 'topUp' })}
            variant="secundario"
            height={52}
            textVariant="buttonXs"
          />
        </Box>
      </Box>

      <Button
        title={t.cash.close}
        onPress={() => openSheet({ type: 'closeOut' })}
        height={54}
        textVariant="buttonMd"
      />
    </Screen>
  );
}
