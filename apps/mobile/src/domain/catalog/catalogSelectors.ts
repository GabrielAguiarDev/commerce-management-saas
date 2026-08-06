import { contem } from '@utils/texto';

import type { CriterioCatalogo, Produto } from './catalogTypes';

/**
 * Seletores puros do catálogo.
 *
 * Ficam no domínio (e não em `@data`) porque operam sobre o MODELO já
 * adaptado — `@data` guarda o formato cru da API. São funções puras, testadas
 * na suíte `logica`, e nenhuma delas conhece React.
 */

/** Casa por nome OU por código, ignorando acento e caixa. Busca vazia casa tudo. */
export function casaBusca(produto: Produto, busca: string): boolean {
  if (!busca.trim()) return true;
  return contem(produto.nome, busca) || contem(produto.codigo ?? '', busca);
}

/**
 * Lista da tela Produtos: busca + chip de filtro.
 *
 * O chip "especial" é "Serviços" no petshop e "Bebidas" na barraca de acarajé.
 * Por isso o critério não é fixo: quando o rótulo é "Serviços" filtra por
 * `ehServico`; senão, filtra pela categoria de mesmo nome.
 */
export function filtrarCatalogo(produtos: Produto[], criterio: CriterioCatalogo): Produto[] {
  return produtos.filter((p) => {
    if (!casaBusca(p, criterio.busca)) return false;
    if (criterio.filtro === 'favoritos') return p.favorito;
    if (criterio.filtro === 'especial') {
      const rotulo = criterio.categoriaEspecial;
      if (!rotulo) return true;
      if (rotulo === 'Serviços') return p.ehServico;
      return (p.categoria ?? '') === rotulo;
    }
    return true;
  });
}

/** Quantos itens a grade de venda mostra antes de exigir busca. */
export const LIMITE_GRADE_VENDA = 8;

/**
 * Grade da tela Vender.
 *
 * Sem busca, mostra só os favoritos — é a tela de "bate-rápido" de quem vende
 * no balcão, e o dono escolhe o que fica à mão favoritando. Com busca, o
 * catálogo inteiro entra na peneira. Em ambos os casos, no máximo 8 cartões:
 * mais que isso exige rolar, e rolar no meio da venda é o que se quer evitar.
 */
export function gradeDeVenda(produtos: Produto[], busca: string): Produto[] {
  const casados = produtos.filter((p) => casaBusca(p, busca));
  const visiveis = busca.trim() ? casados : casados.filter((p) => p.favorito);
  return visiveis.slice(0, LIMITE_GRADE_VENDA);
}

/**
 * `true` quando nem a busca nem o catálogo produziram resultado — o gatilho do
 * estado vazio "Nada encontrado / Cadastrar produto".
 *
 * Repara que olha para `casaBusca`, não para o resultado de `gradeDeVenda`:
 * um catálogo só de não-favoritos NÃO é "nada encontrado", é "nada favoritado".
 */
export function buscaSemResultado(produtos: Produto[], busca: string): boolean {
  return produtos.filter((p) => casaBusca(p, busca)).length === 0;
}

export interface ResumoEstoque {
  emDia: number;
  baixo: number;
  zerado: number;
}

export function resumoDeEstoque(produtos: Produto[]): ResumoEstoque {
  return produtos.reduce<ResumoEstoque>(
    (acc, p) => {
      if (!p.estoque) return acc;
      if (p.estoque.situacao === 'zerado') return { ...acc, zerado: acc.zerado + 1 };
      if (p.estoque.situacao === 'baixo') return { ...acc, baixo: acc.baixo + 1 };
      return { ...acc, emDia: acc.emDia + 1 };
    },
    { emDia: 0, baixo: 0, zerado: 0 },
  );
}

/** Só os que controlam estoque — a lista da tela Estoque. */
export function produtosComEstoque(produtos: Produto[]): Produto[] {
  return produtos.filter((p) => p.estoque !== null);
}

/** Os que pedem atenção, na ordem em que doem: zerados primeiro. */
export function produtosEmAlerta(produtos: Produto[]): Produto[] {
  return produtosComEstoque(produtos)
    .filter((p) => p.estoque?.situacao !== 'em_dia')
    .sort((a, b) => (a.estoque?.quantidade ?? 0) - (b.estoque?.quantidade ?? 0));
}
