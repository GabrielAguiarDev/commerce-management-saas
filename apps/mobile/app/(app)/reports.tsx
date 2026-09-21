import { useRef, useState } from 'react';
import { ScrollView } from 'react-native';

import { Button, Box, Card, Chips, Divider, Gutter, Screen, Text } from '@components';
import type { ChipOption } from '@components';
import {
  PERIODS,
  periodLabel,
  rangeLabel,
  resolveRange,
  shareReportPdf,
  shareReportXlsx,
  useReports,
} from '@domain/reports';
import type { DateRange, DayBar, FinanceLine, ReportPeriod } from '@domain/reports';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { formatBRL } from '@utils/money';
import type { ThemeColor } from '@theme';

/** Altura do gráfico. As barras recebem proporção 0..1 e multiplicam por isto. */
const ALTURA_GRAFICO = 130;

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
  const options: ChipOption<ReportPeriod>[] = PERIODS.map((key) => ({
    key,
    label: periodLabel(key, t),
  }));
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const { data: report } = useReports(period, customRange);
  const bars = report?.bars ?? [];
  const denso = bars.length > MAX_BARRAS_SEMANA;
  const showToast = useUIStore((s) => s.showToast);
  const openSheet = useUIStore((s) => s.openSheet);
  const chartRef = useRef<ScrollView>(null);

  // O que a tela diz que está mostrando. No Personalizado, as datas — o nome
  // do chip sozinho não conta qual período foi escolhido. Também é o nome que
  // vai para o arquivo exportado.
  const periodTitle =
    period === 'custom' ? rangeLabel(resolveRange(period, customRange)) : periodLabel(period, t);

  /**
   * Personalizado abre o calendário — também quando já está selecionado, que
   * é como se troca o intervalo. O chip só muda DEPOIS de aplicar: fechar o
   * calendário sem escolher deixa a tela no período em que estava.
   */
  function selectPeriod(next: ReportPeriod) {
    if (next !== 'custom') {
      setPeriodo(next);
      return;
    }
    openSheet({
      type: 'dateRange',
      initial: customRange ?? resolveRange('month', null),
      onApply: (range) => {
        setCustomRange(range);
        setPeriodo('custom');
      },
    });
  }
  const [gerando, setGerando] = useState<'pdf' | 'xlsx' | null>(null);

  /**
   * Gera o arquivo e abre a folha de compartilhamento.
   *
   * O botão fica em carregamento porque montar o PDF passa pelo motor de
   * impressão do sistema e leva um instante perceptível — sem isso, o toque
   * pareceria ignorado e a pessoa tocaria de novo, gerando dois arquivos.
   *
   * SEM RELATÓRIO NÃO HÁ O QUE EXPORTAR. Gerar uma planilha de três abas
   * vazias seria pior do que dizer que ainda não carregou.
   */
  async function exportar(formato: 'pdf' | 'xlsx') {
    if (!report) {
      showToast(t.toasts.reportNotReady, { tone: 'erro' });
      return;
    }

    setGerando(formato);
    const r =
      formato === 'pdf'
        ? await shareReportPdf(report, periodTitle)
        : await shareReportXlsx(report, periodTitle);
    setGerando(null);

    if (r.ok) return;
    showToast(r.reason === 'unavailable' ? t.toasts.shareUnavailable : t.toasts.exportFailed, {
      tone: 'erro',
    });
  }

  return (
    <Screen title={t.reports.title} subtitle={periodTitle}>
      {/* FORA do `Gutter`: a fileira de períodos rola na horizontal e dá o
          próprio gutter por dentro, para "Personalizado" poder deslizar até a
          borda do aparelho em vez de sumir 16px antes. */}
      <Chips options={options} selecionada={period} onSelect={selectPeriod} />

      <Gutter gap="s12">
        <Card borderRadius="r22" padding="s18">
          <Text variant="titleXs" marginBottom="s14">
            {t.reports.financeSummary}
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
            {t.reports.salesByDay}
          </Text>
          {/* O gráfico não compara nada — só mostra o período. O texto antigo,
              "Comparado com a semana passada", era falso em qualquer período. */}
          <Text variant="hint" color="textMuted" marginBottom="s16">
            {descreverJanela(period, report?.range, t)}
          </Text>

          {/* Rola na horizontal quando o período não cabe: cada barra tem
              largura mínima e o rótulo de cada dia cabe embaixo dela. Com
              poucas barras, `flexGrow` as estica para ocupar o card inteiro,
              como antes. Abre no fim — hoje é o dia que mais importa. */}
          <ScrollView
            ref={chartRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
            onContentSizeChange={() => chartRef.current?.scrollToEnd({ animated: false })}
            accessibilityRole="image"
            accessibilityLabel={descreverGrafico(bars, t)}
          >
            <Box
              flex={1}
              flexDirection="row"
              alignItems="flex-end"
              gap={denso ? 's6' : 's8'}
              height={ALTURA_GRAFICO}
            >
              {bars.map((bar) => (
                <Box
                  key={bar.key}
                  flex={1}
                  minWidth={denso ? LARGURA_MIN_BARRA : undefined}
                  alignItems="center"
                  gap="s7"
                >
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
                  <Text variant="axisLabel" color="textMuted" numberOfLines={1}>
                    {denso ? bar.diaDoMes : bar.dia}
                  </Text>
                </Box>
              ))}
            </Box>
          </ScrollView>
        </Card>

        <Card borderRadius="r22" paddingVertical="s6" paddingHorizontal="s18">
          <Text variant="titleXs" paddingTop="s14" paddingBottom="s6">
            {t.reports.topProducts}
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
              title={t.reports.exportPdf}
              onPress={() => exportar('pdf')}
              loading={gerando === 'pdf'}
              variant="secundario"
              height={50}
              textVariant="buttonXs"
            />
          </Box>
          <Box flex={1}>
            <Button
              title={t.reports.exportSheet}
              onPress={() => exportar('xlsx')}
              loading={gerando === 'xlsx'}
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

/**
 * Acima disto o período não cabe numa semana: o eixo troca o dia da semana
 * ("sex", que se repetiria) pelo dia do mês, e o gráfico passa a rolar.
 */
const MAX_BARRAS_SEMANA = 7;
/** Largura mínima de cada barra no período longo — cabe "30" embaixo dela. */
const LARGURA_MIN_BARRA = 22;

/**
 * O subtítulo do gráfico. Antes era "Comparado com a semana passada" em
 * qualquer período — e o gráfico não compara nada.
 */
function descreverJanela(
  period: ReportPeriod,
  range: DateRange | undefined,
  t: ReturnType<typeof useTranslation>,
): string {
  if (!range) return '';
  if (period === 'today') return t.reports.window.today;
  if (period === 'week') return t.reports.window.lastDays(7);
  return rangeLabel(range);
}

/** Gráfico sem alternativa textual é gráfico invisível para leitor de tela. */
function descreverGrafico(bars: DayBar[], t: ReturnType<typeof useTranslation>): string {
  if (bars.length === 0) return t.reports.chartEmpty;
  const partes = bars.map((b) => `${b.rotuloCompleto}: ${formatBRL(b.amountCents)}`);
  return t.reports.chartA11y(partes.join(', '));
}
