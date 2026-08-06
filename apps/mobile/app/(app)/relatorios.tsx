import { useState } from 'react';

import { Botao, Box, Cartao, Chips, Divisor, Screen, Text } from '@components';
import type { OpcaoDeChip } from '@components';
import { PERIODOS, rotuloDoPeriodo, useRelatorio } from '@domain/reports';
import type { BarraDoDia, LinhaFinanceira, PeriodoRelatorio } from '@domain/reports';
import { TOASTS } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { formatarBRL } from '@utils/dinheiro';
import type { ThemeColor } from '@theme';

/** Altura do gráfico. As barras recebem proporção 0..1 e multiplicam por isto. */
const ALTURA_GRAFICO = 130;

const OPCOES: OpcaoDeChip<PeriodoRelatorio>[] = PERIODOS.map((p) => ({
  chave: p.chave,
  rotulo: p.rotulo,
}));

const COR_DO_VALOR: Record<LinhaFinanceira['destaque'], ThemeColor> = {
  neutro: 'textPrimary',
  positivo: 'success',
  negativo: 'danger',
};

const COR_DA_VARIACAO: Record<LinhaFinanceira['tom'], ThemeColor> = {
  positivo: 'success',
  atencao: 'warning',
  neutro: 'textMuted',
};

export default function TelaRelatorios() {
  const [periodo, setPeriodo] = useState<PeriodoRelatorio>('semana');
  const { data: relatorio } = useRelatorio(periodo);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  return (
    <Screen titulo="Relatórios" subtitulo={rotuloDoPeriodo(periodo)}>
      <Chips opcoes={OPCOES} selecionada={periodo} aoSelecionar={setPeriodo} />

      <Cartao borderRadius="r22" padding="s18">
        <Text variant="titleXs" marginBottom="s14">
          Resumo financeiro
        </Text>
        <Box gap="s12">
          {(relatorio?.financeiro ?? []).map((linha) => (
            <Box key={linha.chave} flexDirection="row" alignItems="center" gap="s10">
              <Box flex={1}>
                <Text variant="rowText" color="textMuted">
                  {linha.rotulo}
                </Text>
              </Box>
              <Text variant="gridPlus" color={COR_DO_VALOR[linha.destaque]}>
                {linha.valorFormatado}
              </Text>
              <Box minWidth={56} alignItems="flex-end">
                <Text variant="hint" color={COR_DA_VARIACAO[linha.tom]}>
                  {linha.variacao}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Cartao>

      <Cartao borderRadius="r22" padding="s18">
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
          accessibilityLabel={descreverGrafico(relatorio?.barras ?? [])}
        >
          {(relatorio?.barras ?? []).map((barra) => (
            <Box key={barra.dia} flex={1} alignItems="center" gap="s7">
              <Box
                width="100%"
                // Mínimo de 3px: um dia sem venda ainda precisa ter um traço,
                // senão o eixo fica com buraco e parece dado faltando.
                height={Math.max(3, barra.proporcao * (ALTURA_GRAFICO - 20))}
                borderTopLeftRadius="r8"
                borderTopRightRadius="r8"
                borderBottomLeftRadius="r3"
                borderBottomRightRadius="r3"
                backgroundColor={barra.destacada ? 'primary' : 'primarySoft'}
              />
              <Text variant="axisLabel" color="textMuted">
                {barra.dia}
              </Text>
            </Box>
          ))}
        </Box>
      </Cartao>

      <Cartao borderRadius="r22" paddingVertical="s6" paddingHorizontal="s18">
        <Text variant="titleXs" paddingTop="s14" paddingBottom="s6">
          Mais vendidos
        </Text>
        {(relatorio?.topProdutos ?? []).map((t) => (
          <Box key={t.nome}>
            <Divisor />
            <Box flexDirection="row" gap="s10" alignItems="center" paddingVertical="s11">
              <Box flex={1}>
                <Text variant="rowLabel">{t.nome}</Text>
              </Box>
              <Text variant="captionSm" color="textMuted">
                {t.quantidadeRotulo}
              </Text>
              <Box minWidth={72} alignItems="flex-end">
                <Text variant="sectionTitle">{formatarBRL(t.totalCentavos)}</Text>
              </Box>
            </Box>
          </Box>
        ))}
      </Cartao>

      <Box flexDirection="row" gap="s10">
        <Box flex={1}>
          <Botao
            titulo="Exportar PDF"
            // Geração de arquivo fora de escopo: exigiria expo-print +
            // expo-sharing. Ver DEVELOPMENT.md › Pendências.
            aoTocar={() => mostrarToast(TOASTS.pdfExportado)}
            variante="secundario"
            altura={50}
            variantTexto="buttonXs"
          />
        </Box>
        <Box flex={1}>
          <Botao
            titulo="Exportar planilha"
            aoTocar={() => mostrarToast(TOASTS.planilhaExportada)}
            variante="secundario"
            altura={50}
            variantTexto="buttonXs"
          />
        </Box>
      </Box>
    </Screen>
  );
}

/** Gráfico sem alternativa textual é gráfico invisível para leitor de tela. */
function descreverGrafico(barras: BarraDoDia[]): string {
  if (barras.length === 0) return 'Gráfico de vendas por dia, sem dados.';
  const partes = barras.map((b) => `${b.dia}: ${formatarBRL(b.valorCentavos)}`);
  return `Vendas por dia. ${partes.join(', ')}.`;
}
