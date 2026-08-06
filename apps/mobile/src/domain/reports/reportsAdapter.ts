import { formatarBRL } from '@utils/dinheiro';

import type { ReportAPI, ReportBarAPI, ReportRowAPI } from './reportsApiTypes';
import type {
  BarraDoDia,
  LinhaFinanceira,
  PeriodoRelatorio,
  Relatorio,
  TomDaVariacao,
} from './reportsTypes';

function toTom(tone: string | null): TomDaVariacao {
  if (tone === 'up_bad') return 'atencao';
  if (tone === 'flat') return 'neutro';
  return 'positivo';
}

/**
 * A cor do VALOR (não da variação) segue o significado da linha, não o sinal
 * do número: "Saiu" é sempre vermelho mesmo caindo, "Sobrou" é sempre verde
 * mesmo baixo. É como o dono lê a tabela — vermelho = dinheiro que foi embora.
 */
function toDestaque(key: string): LinhaFinanceira['destaque'] {
  if (key === 'expense') return 'negativo';
  if (key === 'profit') return 'positivo';
  return 'neutro';
}

function toLinha(raw: ReportRowAPI): LinhaFinanceira {
  return {
    chave: raw.key,
    rotulo: raw.label,
    valorFormatado: raw.text_value ?? formatarBRL(raw.amount_cents ?? 0),
    variacao: raw.variation_label ?? '',
    tom: toTom(raw.variation_tone),
    destaque: toDestaque(raw.key),
  };
}

/**
 * Barras do gráfico "Vendas por dia".
 *
 * A PROPORÇÃO é calculada aqui, no adapter, e não na tela: a tela recebe
 * 0..1 e multiplica pela altura que ela tiver. Foi assim que o gráfico deixou
 * de depender dos 130px fixos do protótipo e passou a funcionar em qualquer
 * largura de aparelho.
 *
 * Semana inteira zerada não pode virar divisão por zero: cai em proporção 0.
 */
export function toBarras(raws: ReportBarAPI[]): BarraDoDia[] {
  const maior = raws.reduce((m, b) => Math.max(m, b.amount_cents), 0);

  return raws.map((b) => ({
    dia: b.day_label,
    valorCentavos: b.amount_cents,
    proporcao: maior > 0 ? b.amount_cents / maior : 0,
    destacada: maior > 0 && b.amount_cents === maior,
  }));
}

export function toRelatorio(raw: ReportAPI, periodo: PeriodoRelatorio): Relatorio {
  return {
    periodo,
    financeiro: raw.rows.map(toLinha),
    barras: toBarras(raw.daily_bars),
    topProdutos: raw.top_products.map((t) => ({
      nome: t.name,
      quantidadeRotulo: t.qty_label,
      totalCentavos: t.amount_cents,
    })),
  };
}
