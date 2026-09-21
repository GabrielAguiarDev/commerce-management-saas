import { formatBRL } from '@utils/money';
import type { Sheet } from '@utils/xlsx';

import type { Report } from './reportsTypes';
import { currentLocale, currentMessages } from '@i18n/active';

/**
 * O RELATÓRIO EM ARQUIVO — a planilha e a página que vira PDF.
 *
 * Tudo aqui é PURO: recebe o relatório já montado e devolve texto ou linhas.
 * Nada de `expo-print`, `expo-file-system` ou `expo-sharing` — quem toca no
 * aparelho é `reportsShare`. É o que permite o jest node abrir o `.xlsx` que
 * sai daqui e conferir célula por célula.
 */

/** `1234` centavos → `12.34`. O XLSX guarda NÚMERO, e número não tem vírgula. */
const reais = (cents: number) => Math.round(cents) / 100;

/**
 * O nome do arquivo, com a data na frente.
 *
 * `2026-08-29` e não `29/08/2026`: barra é separador de caminho em todo lugar,
 * e a ordem ano-mês-dia é a única que ordena sozinha na lista de downloads de
 * quem receber.
 */
export function reportFileName(periodLabel: string, ext: 'pdf' | 'xlsx'): string {
  const dia = new Date().toISOString().slice(0, 10);
  const periodo = periodLabel
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${currentMessages().reports.export.fileName}-${periodo || 'periodo'}-${dia}.${ext}`;
}

/**
 * As três abas da planilha.
 *
 * ┌─ POR QUE O RESUMO VAI COMO TEXTO E O RESTO COMO NÚMERO ────────────────┐
 * │ As linhas do resumo misturam unidades: faturamento é dinheiro, margem  │
 * │ é porcentagem. O domínio guarda as duas já formatadas (`FinanceLine`   │
 * │ não tem o valor cru), e inventar um número a partir do texto seria     │
 * │ adivinhar — inclusive a margem, que viraria "51,3" sem dizer de quê.   │
 * │                                                                        │
 * │ Vendas por dia e mais vendidos têm centavos de verdade no modelo, e é  │
 * │ por isso que essas duas saem somáveis. São justamente as que alguém    │
 * │ abre a planilha para somar.                                            │
 * └────────────────────────────────────────────────────────────────────────┘
 */
export function reportSheets(report: Report, periodLabel: string): Sheet[] {
  const t = currentMessages().reports.export;
  return [
    {
      name: t.summarySheet,
      header: [t.indicator, t.value, t.comparison],
      rows: report.finance.map((l) => [l.label, l.formattedAmount, l.trend]),
    },
    {
      name: t.byDaySheet,
      header: [t.day, t.soldIn(periodLabel)],
      rows: report.bars.map((b) => [b.rotuloCompleto, reais(b.amountCents)]),
    },
    {
      name: t.topSheet,
      header: [t.product, t.quantity, t.totalBrl],
      rows: report.topProducts.map((p) => [p.name, p.quantityLabel, reais(p.totalCents)]),
    },
  ];
}

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function linhas(cells: string[], tag: 'td' | 'th'): string {
  return `<tr>${cells.map((c) => `<${tag}>${escapeHtml(c)}</${tag}>`).join('')}</tr>`;
}

/**
 * A página que o `expo-print` transforma em PDF.
 *
 * HTML, e não um PDF montado byte a byte como no portal: aqui existe um motor
 * de impressão do sistema operacional a um método de distância, e ele já
 * resolve fonte, quebra de página e acentuação — as três coisas que custaram
 * caro do outro lado.
 *
 * O CSS é INLINE e sem fonte externa: o `WKWebView` da impressão não busca
 * arquivo na rede, e uma folha que não carrega imprimiria o relatório na
 * fonte padrão do sistema sem avisar.
 */
export function reportHtml(report: Report, periodLabel: string): string {
  const t = currentMessages().reports.export;
  const gerado = new Date().toLocaleString(currentLocale());

  const resumo = report.finance
    .map((l) => linhas([l.label, l.formattedAmount, l.trend], 'td'))
    .join('');

  const dias = report.bars
    .map((b) => linhas([b.rotuloCompleto, formatBRL(b.amountCents)], 'td'))
    .join('');

  const produtos = report.topProducts
    .map((p) => linhas([p.name, p.quantityLabel, formatBRL(p.totalCents)], 'td'))
    .join('');

  const vazio = `<tr><td colspan="3" class="vazio">${escapeHtml(t.empty)}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="${currentLocale()}">
<head><meta charset="utf-8"><title>${escapeHtml(t.title)}</title>
<style>
  @page { margin: 18mm 14mm; }
  body { font: 12px -apple-system, Roboto, sans-serif; color: #10202c; }
  h1 { font-size: 20px; margin: 0; }
  .sub { color: #6b7c88; margin: 4px 0 22px; font-size: 12px; }
  h2 { font-size: 13px; margin: 22px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #e4eaee; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #6b7c88; }
  td:last-child, th:last-child { text-align: right; }
  .vazio { color: #6b7c88; text-align: center; }
  footer { margin-top: 26px; color: #6b7c88; font-size: 10px; }
</style></head>
<body>
  <h1>${escapeHtml(t.title)}</h1>
  <p class="sub">${escapeHtml(t.generatedAt(periodLabel, gerado))}</p>

  <h2>${escapeHtml(currentMessages().reports.financeSummary)}</h2>
  <table>${linhas([t.indicator, t.value, t.comparison], 'th')}${resumo || vazio}</table>

  <h2>${escapeHtml(t.byDaySheet)}</h2>
  <table>${linhas([t.day, t.sold], 'th')}${dias || vazio}</table>

  <h2>${escapeHtml(t.topSheet)}</h2>
  <table>${linhas([t.product, t.quantity, t.total], 'th')}${produtos || vazio}</table>

  <footer>${escapeHtml(t.footer)}</footer>
</body></html>`;
}
