import type { Produto } from "@/types/types";

export const UNIDADES = ["un", "kg", "L", "serviço"];

/** Produto controlado que chegou (ou passou) do mínimo — o que dispara alerta. */
export function estoqueBaixo(p: Produto): boolean {
  return p.estoque != null && p.minimo != null && p.estoque <= p.minimo;
}

/** Só o que tem prateleira entra na tela de Estoque. */
export function controlaEstoque(p: Produto): boolean {
  return p.estoque != null;
}

/**
 * As categorias vêm dos próprios produtos, não de uma tabela.
 *
 * `products.category` é texto livre, então a lista de escolhas é o conjunto do
 * que já foi usado. É o bastante para o filtro e para o seletor do cadastro;
 * uma categoria só passa a existir quando algum produto a usa.
 */
export function categoriasDe(produtos: Produto[]): string[] {
  return Array.from(new Set(produtos.map((p) => p.categoria).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}
