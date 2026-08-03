import { FORMAS } from "@/lib/dados/vendas";
import { proximoId } from "@/lib/dados/uid";
import type {
  CaixaAberto,
  CaixaFechado,
  FormaPagamento,
  MovCaixa,
  PerfilKey,
  TipoMovCaixa,
} from "@/types/types";

const FECHADOS_SEED: Omit<CaixaFechado, "id" | "operador">[] = [
  {
    d: 1,
    abertura: "08:05",
    fechamento: "18:30",
    inicial: 300,
    vendas: { Dinheiro: 358, Pix: 690, Débito: 358, Crédito: 520 },
    movs: [{ id: 0, hora: "15:10", tipo: "sangria", valor: 300, motivo: "Retirada para o cofre" }],
    contado: { Dinheiro: 358, Pix: 690, Débito: 358, Crédito: 520 },
    obs: "",
  },
  {
    d: 2,
    abertura: "08:00",
    fechamento: "18:10",
    inicial: 250,
    vendas: { Dinheiro: 402, Pix: 540, Débito: 300, Crédito: 410 },
    movs: [],
    contado: { Dinheiro: 640, Pix: 540, Débito: 300, Crédito: 410 },
    obs: "Faltou troco de R$ 12. Conferi a gaveta duas vezes.",
  },
  {
    d: 3,
    abertura: "08:20",
    fechamento: "19:00",
    inicial: 300,
    vendas: { Dinheiro: 288, Pix: 612, Débito: 275, Crédito: 480 },
    movs: [{ id: 0, hora: "12:05", tipo: "reforco", valor: 100, motivo: "Troco extra do cofre" }],
    contado: { Dinheiro: 693, Pix: 612, Débito: 275, Crédito: 480 },
    obs: "",
  },
];

export interface EstadoCaixa {
  aberto: CaixaAberto | null;
  fechados: CaixaFechado[];
}

/**
 * Só o petshop tem o módulo de caixa. Para a barraca de acarajé o estado nasce
 * vazio e a tela nem aparece no menu — é o mesmo dado que decide as duas coisas.
 */
export function mkCaixas(perfil: PerfilKey, operador: string): EstadoCaixa {
  if (perfil !== "petshop") return { aberto: null, fechados: [] };

  return {
    aberto: {
      id: proximoId(),
      abertura: "08:12",
      inicial: 300,
      operador,
      movs: [
        {
          id: proximoId(),
          hora: "11:40",
          tipo: "sangria",
          valor: 200,
          motivo: "Retirada para o cofre",
        },
      ],
    },
    fechados: FECHADOS_SEED.map((c) => ({
      ...c,
      id: proximoId(),
      operador,
      movs: c.movs.map((m) => ({ ...m, id: proximoId() })),
    })),
  };
}

/** Reforço entra na gaveta, sangria sai dela. */
export function saldoMovs(movs: MovCaixa[] | undefined): number {
  return (movs || []).reduce((a, m) => a + (m.tipo === "reforco" ? m.valor : -m.valor), 0);
}

/**
 * O que deveria estar em cada forma no fechamento.
 *
 * Só o dinheiro acumula troco inicial e movimentações da gaveta — Pix e cartão
 * caem na conta, então o esperado deles é a soma das vendas e nada mais.
 */
export function esperadoCx(cx: {
  inicial: number;
  vendas?: Partial<Record<FormaPagamento, number>>;
  movs?: MovCaixa[];
}): Record<FormaPagamento, number> {
  const e = {} as Record<FormaPagamento, number>;
  for (const f of FORMAS) e[f] = cx.vendas?.[f] ?? 0;
  e.Dinheiro = (cx.inicial || 0) + e.Dinheiro + saldoMovs(cx.movs);
  return e;
}

export function somaFormas(o: Partial<Record<FormaPagamento, number>> | undefined): number {
  return FORMAS.reduce((a, f) => a + (o?.[f] ?? 0), 0);
}

export const MOV_CAIXA_ESTILO: Record<TipoMovCaixa, { rotulo: string; cor: string; bg: string }> = {
  sangria: { rotulo: "Sangria", cor: "var(--warn)", bg: "var(--warn-soft)" },
  reforco: { rotulo: "Reforço", cor: "var(--pos)", bg: "var(--pos-soft)" },
};

export const MOTIVOS_SANGRIA = ["Retirada para o cofre", "Pagamento de fornecedor", "Depósito"];
export const MOTIVOS_REFORCO = ["Troco extra do cofre", "Aporte do dono"];

/** Valores de troco que a pessoa costuma deixar na gaveta ao abrir. */
export const TROCOS_RAPIDOS = [100, 200, 300, 500];
