"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer, type ActionResult } from "@/lib/sessao";

export interface ProductToSave {
  id: string | null;
  name: string;
  price: number;
  category: string;
  code: string;
  cost: number;
  /** `null` quando o produto não controla estoque. */
  stock: number | null;
  minimum: number | null;
  unit: string;
  active: boolean;
  fav: boolean;
  service: boolean;
}

export async function saveProduct(p: ProductToSave): Promise<ActionResult> {
  const session = await requireCustomer("cadastrar um produto");
  if (!session.ok) return session;

  if (!p.name.trim()) return { ok: false, message: "O produto precisa de um nome." };
  if (!(p.price > 0)) return { ok: false, message: "Informe um preço maior que zero." };

  const { supabase, tenantId } = session;

  const fields = {
    name: p.name.trim(),
    price: p.price,
    cost: p.cost || null,
    category: p.category.trim() || null,
    barcode: p.code.trim() || null,
    unit: p.unit,
    is_service: p.service,
    is_favorite: p.fav,
    is_active: p.active,
    tracks_stock: p.stock != null,
    stock_quantity: p.stock,
    stock_min: p.minimum,
  };

  const { error } = p.id
    ? await supabase.from("products").update(fields).eq("id", p.id)
    : await supabase.from("products").insert({ tenant_id: tenantId, ...fields });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setFav(id: string, fav: boolean): Promise<ActionResult> {
  const session = await requireCustomer("alterar um produto");
  if (!session.ok) return session;

  const { error } = await session.supabase
    .from("products")
    .update({ is_favorite: fav })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setActive(id: string, active: boolean): Promise<ActionResult> {
  const session = await requireCustomer("alterar um produto");
  if (!session.ok) return session;

  const { error } = await session.supabase.from("products").update({ is_active: active }).eq("id", id);

  if (error) return { ok: false, message: error.message };
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
export async function deleteProduct(id: string): Promise<ActionResult> {
  const session = await requireCustomer("excluir um produto");
  if (!session.ok) return session;

  const { error } = await session.supabase.from("products").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message:
        "Este produto tem movimentações ligadas a ele e não pode ser excluído. Pause a venda para tirá-lo do balcão.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
