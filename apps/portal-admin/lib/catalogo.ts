import {
  ehPlanoFixo,
  MENSALIDADE_PADRAO,
  PACOTES_FIXOS,
  PLANOS as CHAVES_PLANO,
  ROTULO_PLANO,
  type Plano as ChavePlano,
} from "@/lib/planos";
import type { Plano } from "@/types/types";

/**
 * Ponte entre a regra comercial (`lib/planos.ts`) e a forma que a interface
 * consome.
 *
 * Só sobrou o catálogo de PLANOS. Os módulos saíram daqui: agora vêm da tabela
 * `modules`, lidos por `lib/modulos.ts` e entregues às telas pelo provider.
 * Planos continuam em código porque não há tabela de planos — a oferta é regra
 * comercial, não dado editável (ver o levantamento em lib/mock/data.ts).
 *
 * Os textos existem só em português; a forma `Loc` fica de pé para quando
 * houver tradução real, repetindo o mesmo texto nos dois idiomas enquanto isso.
 */

const umTexto = (t: string) => ({ pt: t, en: t });

const DESCRICAO_PLANO: Record<ChavePlano, string> = {
  free: "Entrada para comércios pequenos: vendas, catálogo de produtos e custos.",
  paid: "Todos os módulos liberados, relatórios, estoque, suporte e acesso ao app mobile.",
  custom:
    "Para redes e operações maiores: módulos escolhidos um a um e mensalidade " +
    "negociada caso a caso no cadastro do cliente.",
};

/**
 * Catálogo de planos no formato das telas.
 *
 * `mods` do plano customizado fica vazio de propósito: "todos os módulos" só se
 * sabe depois de ler o banco, e a tela preenche isso a partir de `s.modulos`
 * (ver `planosComCatalogo`).
 */
export const PLANOS_CATALOGO: Plano[] = CHAVES_PLANO.map((k) => {
  const mensalidade = MENSALIDADE_PADRAO[k];
  return {
    k,
    nome: umTexto(ROTULO_PLANO[k]),
    tipo: ehPlanoFixo(k) ? ("fixo" as const) : ("custom" as const),
    // `null` marca o preço negociado: a tela mostra "sob consulta" em vez de um valor.
    preco: mensalidade === null ? null : "R$ " + mensalidade,
    desc: umTexto(DESCRICAO_PLANO[k]),
    mods: ehPlanoFixo(k) ? [...PACOTES_FIXOS[k]] : [],
  };
});

/**
 * Completa o plano customizado com todos os módulos do catálogo real. Chamado
 * onde o catálogo já está disponível, para não deixar o cartão do customizado
 * anunciando "0 módulos inclusos".
 */
export function planosComCatalogo(planos: Plano[], chavesDoBanco: string[]): Plano[] {
  return planos.map((p) => (p.tipo === "custom" ? { ...p, mods: chavesDoBanco } : p));
}
