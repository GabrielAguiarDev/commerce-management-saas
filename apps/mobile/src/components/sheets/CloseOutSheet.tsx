import { useState } from 'react';

import { BottomSheet } from '@components/patterns/BottomSheet';
import { Button } from '@components/ui/Button';
import { Box } from '@components/ui/Box';
import { Field } from '@components/ui/Field';
import { Divider } from '@components/ui/Divider';
import { Text } from '@components/ui/Text';
import { computeDifference, countRows, useFecharCaixa, useOpenShift } from '@domain/cash';
import { useTranslation } from '@i18n';
import { CashError } from '@domain/cash/cashTypes';
import { useUIStore } from '@store/uiStore';
import { formatBRL, formatSignedBRL } from '@utils/money';

/**
 * "Fechar o caixa": a conferência.
 *
 * A diferença é recalculada A CADA TECLA, e é isso que faz o dono entender o
 * que está fazendo. Linha em branco não conta — ver `calcularDiferenca`, que é
 * função pura e tem teste dedicado justamente porque é o número que decide se
 * alguém vai ser acusado de furo de caixa.
 */
export function CloseOutSheet() {
  const t = useTranslation();
  const { data: shift } = useOpenShift();
  const closeSheet = useUIStore((s) => s.closeSheet);
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);
  const { mutate: closeCash, isPending } = useFecharCaixa();

  const [conferido, setConferido] = useState<Record<string, string>>({});

  const rows = shift ? countRows(shift) : [];
  const diferenca = computeDifference(rows, conferido);

  function requestCloseOut() {
    requestConfirm({
      title: t.confirms.closeCash.title,
      text: t.confirms.closeCash.text,
      buttonLabel: t.confirms.closeCash.button,
      destructive: false,
      onConfirm: () =>
        closeCash(diferenca.diferencaCentavos, {
          onSuccess: () => {
            closeSheet();
            showToast(t.toasts.cashClosed);
          },
          onError: (error) => {
            const code = error instanceof CashError ? error.code : 'unknown';
            showToast(t.errors.cash[code], { tone: 'erro' });
          },
        }),
    });
  }

  return (
    <BottomSheet title="Fechar o caixa" onClose={closeSheet}>
      <Text variant="bodySm" color="textMuted" marginBottom="s14">
        Confira quanto realmente tem em cada forma. A gente calcula a diferença pra você.
      </Text>

      {rows.map((row) => (
        <Box key={row.method}>
          <Box flexDirection="row" alignItems="center" gap="s10" paddingVertical="s10">
            <Box flex={1}>
              <Text variant="sectionTitle">{row.method}</Text>
              <Text variant="hint" color="textMuted" marginTop="s2">
                sistema {formatBRL(row.esperadoCentavos)}
              </Text>
            </Box>
            <Box width={104}>
              <Field
                value={conferido[row.method] ?? ''}
                onChangeText={(t) => setConferido((current) => ({ ...current, [row.method]: t }))}
                placeholder="0,00"
                keyboardType="decimal-pad"
                height={44}
                radius={12}
                alignRight
                accessibilityLabel={`Valor conferido em ${row.method}`}
              />
            </Box>
          </Box>
          <Divider />
        </Box>
      ))}

      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        paddingVertical="s16"
      >
        <Text variant="sectionTitle" color="textMuted">
          Diferença
        </Text>
        <Text variant="statValue">
          {diferenca.informado
            ? formatSignedBRL(diferenca.diferencaCentavos)
            : formatBRL(0)}
        </Text>
      </Box>

      <Button
        title="Conferir e fechar"
        onPress={requestCloseOut}
        height={54}
        textVariant="buttonMd"
        loading={isPending}
        disabled={!shift}
      />
    </BottomSheet>
  );
}
