import type { ReportAPI } from '@domain/reports/reportsApiTypes';

import { ID_ACARAJE, ID_PETSHOP } from './tenants';

/**
 * Relatórios mock no formato cru da API.
 *
 * O protótipo trazia as barras já em PIXELS (52, 74, ... 130). Aqui elas são
 * valores em centavos e o adapter converte para proporção — o desenho final é
 * o mesmo (sábado continua sendo a barra cheia), mas o gráfico deixou de
 * depender da altura fixa de 130px do protótipo.
 */

const BARRAS_BASE = [
  { day_label: 'seg', peso: 52 },
  { day_label: 'ter', peso: 74 },
  { day_label: 'qua', peso: 61 },
  { day_label: 'qui', peso: 96 },
  { day_label: 'sex', peso: 118 },
  { day_label: 'sáb', peso: 130 },
  { day_label: 'dom', peso: 44 },
];

const barras = (fator: number) =>
  BARRAS_BASE.map((b) => ({ day_label: b.day_label, amount_cents: b.peso * fator }));

export const RELATORIOS_API: Record<string, ReportAPI> = {
  [ID_PETSHOP]: {
    period: 'semana',
    rows: [
      {
        key: 'income',
        label: 'Entrou',
        amount_cents: 742000,
        text_value: null,
        variation_label: '+12%',
        variation_tone: 'up_good',
      },
      {
        key: 'expense',
        label: 'Saiu',
        amount_cents: 361000,
        text_value: null,
        variation_label: '+4%',
        variation_tone: 'up_bad',
      },
      {
        key: 'profit',
        label: 'Sobrou',
        amount_cents: 381000,
        text_value: null,
        variation_label: '+18%',
        variation_tone: 'up_good',
      },
      {
        key: 'margin',
        label: 'Margem',
        amount_cents: null,
        text_value: '51,3%',
        variation_label: '+3 p.p.',
        variation_tone: 'up_good',
      },
    ],
    daily_bars: barras(1200),
    top_products: [
      { name: 'Ração premium 15kg', qty_label: '14 un', amount_cents: 265860 },
      { name: 'Banho & tosa médio', qty_label: '22 un', amount_cents: 154000 },
      { name: 'Areia higiênica 4kg', qty_label: '31 un', amount_cents: 88350 },
    ],
  },

  [ID_ACARAJE]: {
    period: 'semana',
    rows: [
      {
        key: 'income',
        label: 'Entrou',
        amount_cents: 238000,
        text_value: null,
        variation_label: '+12%',
        variation_tone: 'up_good',
      },
      {
        key: 'expense',
        label: 'Saiu',
        amount_cents: 89000,
        text_value: null,
        variation_label: '+4%',
        variation_tone: 'up_bad',
      },
      {
        key: 'profit',
        label: 'Sobrou',
        amount_cents: 149000,
        text_value: null,
        variation_label: '+18%',
        variation_tone: 'up_good',
      },
      {
        key: 'margin',
        label: 'Margem',
        amount_cents: null,
        text_value: '62,6%',
        variation_label: '+3 p.p.',
        variation_tone: 'up_good',
      },
    ],
    daily_bars: barras(400),
    top_products: [
      { name: 'Acarajé completo', qty_label: '148 un', amount_cents: 177600 },
      { name: 'Combo acarajé + refri', qty_label: '52 un', amount_cents: 83200 },
      { name: 'Abará', qty_label: '46 un', amount_cents: 46000 },
    ],
  },
};
