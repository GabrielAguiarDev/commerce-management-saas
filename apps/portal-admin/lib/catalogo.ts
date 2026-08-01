import {
  CATALOGO_MODULOS,
  ehPlanoFixo,
  MENSALIDADE_PADRAO,
  PACOTES_FIXOS,
  PLANOS as CHAVES_PLANO,
  ROTULO_PLANO,
  type Plano as ChavePlano,
} from "@/lib/planos";
import type { Modulo, Plano } from "@/types/types";

/**
 * Ponte entre a regra comercial (`lib/planos.ts`) e as formas que a interface
 * já consumia dos dados de exemplo.
 *
 * Antes, `MODULOS` e `PLANOS` viviam em `lib/mock/data.ts` com chaves em
 * português ("vendas", "Gratuito"). O banco usa as chaves em inglês da tabela
 * `modules` e os planos "free" | "paid" | "custom" — e os módulos de um cliente
 * vêm de lá. Manter dois vocabulários faria a ficha do cliente nunca casar um
 * módulo com o outro, então o catálogo passou a sair daqui.
 *
 * Os textos existem só em português: o banco tem uma coluna por campo. A forma
 * `Loc` fica de pé para quando houver tradução real, repetindo o mesmo texto
 * nos dois idiomas enquanto isso.
 */

const umTexto = (t: string) => ({ pt: t, en: t });

/** Planos que incluem um módulo. O customizado monta qualquer combinação. */
function planosComModulo(chave: string): string[] {
  const fixos = (["free", "paid"] as const).filter((p) => PACOTES_FIXOS[p].includes(chave));
  return [...fixos, "custom"];
}

/** Catálogo de módulos no formato das telas (Módulos e ficha do cliente). */
export const MODULOS_CATALOGO: Modulo[] = CATALOGO_MODULOS.map((m) => ({
  k: m.chave,
  ...(m.acesso ? { tipo: "acesso" as const } : {}),
  nome: umTexto(m.nome),
  sigla: m.sigla,
  desc: umTexto(m.descricao),
  planos: planosComModulo(m.chave),
}));

const DESCRICAO_PLANO: Record<ChavePlano, string> = {
  free: "Entrada para comércios pequenos: vendas, catálogo de produtos e custos.",
  paid: "Todos os módulos liberados, relatórios, estoque, suporte e acesso ao app mobile.",
  custom:
    "Para redes e operações maiores: módulos escolhidos um a um e mensalidade " +
    "negociada caso a caso no cadastro do cliente.",
};

/** Catálogo de planos no formato das telas. */
export const PLANOS_CATALOGO: Plano[] = CHAVES_PLANO.map((k) => {
  const mensalidade = MENSALIDADE_PADRAO[k];
  return {
    k,
    nome: umTexto(ROTULO_PLANO[k]),
    tipo: ehPlanoFixo(k) ? ("fixo" as const) : ("custom" as const),
    // `null` marca o preço negociado: a tela mostra "sob consulta" em vez de um valor.
    preco: mensalidade === null ? null : "R$ " + mensalidade,
    desc: umTexto(DESCRICAO_PLANO[k]),
    mods: ehPlanoFixo(k) ? [...PACOTES_FIXOS[k]] : CATALOGO_MODULOS.map((m) => m.chave),
  };
});
