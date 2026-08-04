"use server";

import { revalidatePath } from "next/cache";
import { exigirCliente, type ResultadoAcao } from "@/lib/sessao";

export interface ProdutoParaSalvar {
  id: string | null;
  nome: string;
  preco: number;
  categoria: string;
  codigo: string;
  custo: number;
  /** `null` quando o produto não controla estoque. */
  estoque: number | null;
  minimo: number | null;
  unidade: string;
  ativo: boolean;
  fav: boolean;
  servico: boolean;
}

export async function salvarProduto(p: ProdutoParaSalvar): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("cadastrar um produto");
  if (!sessao.ok) return sessao;

  if (!p.nome.trim()) return { ok: false, mensagem: "O produto precisa de um nome." };
  if (!(p.preco > 0)) return { ok: false, mensagem: "Informe um preço maior que zero." };

  const { supabase, tenantId } = sessao;

  const campos = {
    name: p.nome.trim(),
    price: p.preco,
    cost: p.custo || null,
    category: p.categoria.trim() || null,
    barcode: p.codigo.trim() || null,
    unit: p.unidade,
    is_service: p.servico,
    is_favorite: p.fav,
    is_active: p.ativo,
    tracks_stock: p.estoque != null,
    stock_quantity: p.estoque,
    stock_min: p.minimo,
  };

  const { error } = p.id
    ? await supabase.from("products").update(campos).eq("id", p.id)
    : await supabase.from("products").insert({ tenant_id: tenantId, ...campos });

  if (error) return { ok: false, mensagem: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function alternarFavorito(id: string, fav: boolean): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("alterar um produto");
  if (!sessao.ok) return sessao;

  const { error } = await sessao.supabase
    .from("products")
    .update({ is_favorite: fav })
    .eq("id", id);

  if (error) return { ok: false, mensagem: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function alternarAtivo(id: string, ativo: boolean): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("alterar um produto");
  if (!sessao.ok) return sessao;

  const { error } = await sessao.supabase.from("products").update({ is_active: ativo }).eq("id", id);

  if (error) return { ok: false, mensagem: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Exclui um produto do catálogo.
 *
 * As vendas antigas não somem junto: `sale_items` guarda `product_name` e
 * `unit_price` copiados no momento da venda, então o histórico continua legível
 * mesmo sem o produto. Se o banco recusar por causa de uma referência, a
 * mensagem sugere pausar em vez de excluir.
 */
export async function excluirProduto(id: string): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("excluir um produto");
  if (!sessao.ok) return sessao;

  const { error } = await sessao.supabase.from("products").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      mensagem:
        "Este produto tem movimentações ligadas a ele e não pode ser excluído. Pause a venda para tirá-lo do balcão.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
