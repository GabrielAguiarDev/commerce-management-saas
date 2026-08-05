import type { Product } from "@/types/types";

export const UNITS = ["un", "kg", "L", "serviço"];

/** Produto controlado que chegou (ou passou) do mínimo — o que dispara alerta. */
export function lowStock(p: Product): boolean {
  return p.stock != null && p.minimum != null && p.stock <= p.minimum;
}

/** Só o que tem prateleira entra na tela de Estoque. */
export function tracksStock(p: Product): boolean {
  return p.stock != null;
}

/**
 * As categorias vêm dos próprios produtos, não de uma tabela.
 *
 * `products.category` é texto livre, então a lista de escolhas é o conjunto do
 * que já foi usado. É o bastante para o filtro e para o seletor do cadastro;
 * uma categoria só passa a existir quando algum produto a usa.
 */
export function categoriesOf(products: Product[]): string[] {
  return Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}
