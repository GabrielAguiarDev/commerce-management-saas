import { Button, Box, Card, Divider, Icon, Pill, Screen, Skeleton, Text } from '@components';
import {
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

  const subtitle = shift ? 'Turno aberto hoje' : 'Nenhum turno aberto';

  // Enquanto não se sabe se o caixa está aberto, o ESQUELETO ocupa o lugar —
  // e não o vazio de antes. Alternar de "fechado" para "aberto" depois de
  // renderizar seria um salto visual feio bem no meio do turno; sumir com o
  // corpo da tela é pior ainda, porque some junto a sensação de que o app
  // respondeu. Header e tab bar continuam desenhados ao redor: quem espera vê
  // a navegação inteira, só sem o número.
  if (isPending) {
    return (
      <Screen title="Caixa" subtitle={subtitle} padded>
        <Skeleton height={128} borderRadius="r22" />
        <Skeleton height={168} borderRadius="r20" />
        <Skeleton height={52} borderRadius="r16" />
      </Screen>
    );
  }

  if (!shift) {
    return (
      <Screen title="Caixa" subtitle={subtitle} padded>
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
          <Text variant="titleMd">O caixa está fechado</Text>
          <Text
            variant="bodySm"
            color="textMuted"
            textAlign="center"
            marginTop="s8"
            marginBottom="s18"
          >
            Abra o caixa para começar o dia e acompanhar o dinheiro que entra e sai.
          </Text>
          <Button
            title="Abrir caixa"
            onPress={() =>
              openCash(undefined, { onSuccess: () => showToast(t.toasts.cashOpened) })
            }
            loading={abrindo}
            height={52}
          />
        </Card>

        <Text variant="sectionLabel" color="textMuted" marginTop="s6">
          Turnos anteriores
        </Text>

        {history.map((t) => {
          const diferenca = labelDifference(t.diferencaCentavos, formatBRL);
          return (
            <Box
              key={t.id}
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
                <Text variant="titleXs">{t.dateLabel}</Text>
                <Text variant="captionSm" color="textMuted" marginTop="s3">
                  {t.periodLabel}
                </Text>
              </Box>
              <Box alignItems="flex-end">
                <Text variant="titleXs">{formatBRL(t.totalCents)}</Text>
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
    <Screen title="Caixa" subtitle={subtitle} padded>
      <Box backgroundColor="petrol" borderRadius="r22" padding="s20">
        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
          <Text variant="chipLabel" color="onPetrol" opacity={0.7}>
            Na gaveta agora
          </Text>
          <Pill
            text={`Aberto às ${shift.openedAt}`}
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
          Opening {formatBRL(shift.aberturaCentavos)} · sales em dinheiro{' '}
          {formatBRL(shift.cashSalesCents)}
        </Text>
      </Box>

      <Card paddingVertical="s6" paddingHorizontal="s16">
        <Text variant="sectionTitle" paddingTop="s13" paddingBottom="s4">
          Recebido no turno
        </Text>
        {shift.receipts.map((r) => (
          <Box key={r.method}>
            <Divider />
            <Box flexDirection="row" alignItems="center" gap="s10" paddingVertical="s11">
              <Box flex={1}>
                <Text variant="rowLabel">{r.method}</Text>
              </Box>
              <Text variant="titleXs">{formatBRL(r.amountCents)}</Text>
            </Box>
          </Box>
        ))}
      </Card>

      <Box flexDirection="row" gap="s10">
        <Box flex={1}>
          <Button
            title="Sangria"
            onPress={() => openSheet({ type: 'withdrawal' })}
            variant="secundario"
            height={52}
            textVariant="buttonXs"
          />
        </Box>
        <Box flex={1}>
          <Button
            title="Reforço"
            onPress={() => openSheet({ type: 'topUp' })}
            variant="secundario"
            height={52}
            textVariant="buttonXs"
          />
        </Box>
      </Box>

      <Button
        title="Fechar caixa"
        onPress={() => openSheet({ type: 'closeOut' })}
        height={54}
        textVariant="buttonMd"
      />
    </Screen>
  );
}
