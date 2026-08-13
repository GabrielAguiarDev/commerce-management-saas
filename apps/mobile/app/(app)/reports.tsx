import { useState } from 'react';

import { Button, Box, Card, Chips, Divider, Gutter, Screen, Text } from '@components';
import type { ChipOption } from '@components';
import { PERIODS, periodLabel, useReports } from '@domain/reports';
import type { DayBar, FinanceLine, ReportPeriod } from '@domain/reports';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { formatBRL } from '@utils/money';
import type { ThemeColor } from '@theme';

/** Altura do gráfico. As barras recebem proporção 0..1 e multiplicam por isto. */
const ALTURA_GRAFICO = 130;

const OPTIONS: ChipOption<ReportPeriod>[] = PERIODS.map((p) => ({
  key: p.key,
  label: p.label,
}));

const AMOUNT_COLOR: Record<FinanceLine['highlight'], ThemeColor> = {
  neutral: 'textPrimary',
  positive: 'success',
  negative: 'danger',
};

const TREND_COLOR: Record<FinanceLine['tone'], ThemeColor> = {
  positive: 'success',
  warning: 'warning',
  neutral: 'textMuted',
};

export default function ReportsScreen() {
  const t = useTranslation();
  const [period, setPeriodo] = useState<ReportPeriod>('week');
  const { data: report } = useReports(period);
  const showToast = useUIStore((s) => s.showToast);

  return (
    <Screen title="Relatórios" subtitle={periodLabel(period)}>
      {/* FORA do `Gutter`: a fileira de períodos rola na horizontal e dá o
          próprio gutter por dentro, para "Personalizado" poder deslizar até a
          borda do aparelho em vez de sumir 16px antes. */}
      <Chips options={OPTIONS} selecionada={period} onSelect={setPeriodo} />

      <Gutter gap="s12">
        <Card borderRadius="r22" padding="s18">
          <Text variant="titleXs" marginBottom="s14">
            Resumo financeiro
          </Text>
          <Box gap="s12">
            {(report?.finance ?? []).map((row) => (
              <Box key={row.key} flexDirection="row" alignItems="center" gap="s10">
                <Box flex={1}>
                  <Text variant="rowText" color="textMuted">
                    {row.label}
                  </Text>
                </Box>
                <Text variant="gridPlus" color={AMOUNT_COLOR[row.highlight]}>
                  {row.formattedAmount}
                </Text>
                <Box minWidth={56} alignItems="flex-end">
                  <Text variant="hint" color={TREND_COLOR[row.tone]}>
                    {row.trend}
                  </Text>
                </Box>
              </Box>
            ))}
          </Box>
        </Card>

        <Card borderRadius="r22" padding="s18">
          <Text variant="titleXs" marginBottom="s6">
            Vendas por dia
          </Text>
          <Text variant="hint" color="textMuted" marginBottom="s16">
            Comparado com a semana passada
          </Text>

          <Box
            flexDirection="row"
            alignItems="flex-end"
            gap="s8"
            height={ALTURA_GRAFICO}
            accessibilityRole="image"
            accessibilityLabel={descreverGrafico(report?.bars ?? [])}
          >
            {(report?.bars ?? []).map((bar) => (
              <Box key={bar.dia} flex={1} alignItems="center" gap="s7">
                <Box
                  width="100%"
                  // Mínimo de 3px: um dia sem venda ainda precisa ter um traço,
                  // senão o eixo fica com buraco e parece dado faltando.
                  height={Math.max(3, bar.ratio * (ALTURA_GRAFICO - 20))}
                  borderTopLeftRadius="r8"
                  borderTopRightRadius="r8"
                  borderBottomLeftRadius="r3"
                  borderBottomRightRadius="r3"
                  backgroundColor={bar.destacada ? 'primary' : 'primarySoft'}
                />
                <Text variant="axisLabel" color="textMuted">
                  {bar.dia}
                </Text>
              </Box>
            ))}
          </Box>
        </Card>

        <Card borderRadius="r22" paddingVertical="s6" paddingHorizontal="s18">
          <Text variant="titleXs" paddingTop="s14" paddingBottom="s6">
            Mais vendidos
          </Text>
          {(report?.topProducts ?? []).map((t) => (
            <Box key={t.name}>
              <Divider />
              <Box flexDirection="row" gap="s10" alignItems="center" paddingVertical="s11">
                <Box flex={1}>
                  <Text variant="rowLabel">{t.name}</Text>
                </Box>
                <Text variant="captionSm" color="textMuted">
                  {t.quantityLabel}
                </Text>
                <Box minWidth={72} alignItems="flex-end">
                  <Text variant="sectionTitle">{formatBRL(t.totalCents)}</Text>
                </Box>
              </Box>
            </Box>
          ))}
        </Card>

        <Box flexDirection="row" gap="s10">
          <Box flex={1}>
            <Button
              title="Exportar PDF"
              // Geração de arquivo fora de escopo: exigiria expo-print +
              // expo-sharing. Ver DEVELOPMENT.md › Pendências.
              onPress={() => showToast(t.toasts.pdfExported)}
              variant="secundario"
              height={50}
              textVariant="buttonXs"
            />
          </Box>
          <Box flex={1}>
            <Button
              title="Exportar planilha"
              onPress={() => showToast(t.toasts.spreadsheetExported)}
              variant="secundario"
              height={50}
              textVariant="buttonXs"
            />
          </Box>
        </Box>
      </Gutter>
    </Screen>
  );
}

/** Gráfico sem alternativa textual é gráfico invisível para leitor de tela. */
function descreverGrafico(bars: DayBar[]): string {
  if (bars.length === 0) return 'Gráfico de vendas por dia, sem dados.';
  const partes = bars.map((b) => `${b.dia}: ${formatBRL(b.amountCents)}`);
  return `Vendas por dia. ${partes.join(', ')}.`;
}
