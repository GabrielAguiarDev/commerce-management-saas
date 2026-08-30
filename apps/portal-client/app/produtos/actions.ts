"use server";

import { revalidatePath } from "next/cache";
import {
  gtinAccepted,
  isValidCest,
  isValidCfop,
  isValidNcm,
  NO_GTIN,
  onlyDigits,
} from "@/lib/dados/fiscal";
import { logActivity } from "@/lib/historico";
import { requireCustomer, type ActionResult } from "@/lib/sessao";
import type { ProductFiscal } from "@/types/types";

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
  /**
   * Campo fiscal VAZIO grava `null`, e nulo quer dizer "usa o padrão do
   * negócio" — não "faltando". Gravar uma cópia do padrão aqui congelaria o
   * valor: mudar o padrão depois deixaria de valer para este produto.
   */
  fiscal: ProductFiscal;
}

export async function saveProduct(p: ProductToSave): Promise<ActionResult> {
  const session = await requireCustomer("cadastrar um produto");
  if (!session.ok) return session;

  if (!p.name.trim()) return { ok: false, message: "O produto precisa de um nome." };
  if (!(p.price > 0)) return { ok: false, message: "Informe um preço maior que zero." };

  const ncm = onlyDigits(p.fiscal.ncm);
  const cest = onlyDigits(p.fiscal.cest);
  const cfop = onlyDigits(p.fiscal.cfop);
  const gtin = p.fiscal.gtin.trim().toUpperCase();

  // Só o que foi PREENCHIDO é checado: vazio herda o padrão do negócio e é um
  // estado legítimo, não um erro de digitação.
  if (ncm && !isValidNcm(ncm)) return { ok: false, message: "O NCM precisa ter 8 dígitos." };
  if (cest && !isValidCest(cest)) return { ok: false, message: "O CEST precisa ter 7 dígitos." };
  if (cfop && !isValidCfop(cfop)) return { ok: false, message: "O CFOP precisa ter 4 dígitos." };

  // O dígito verificador do GTIN é a rejeição mais cara do cadastro: o código
  // interno da balança passa em qualquer campo de texto e reprova a nota
  // inteira. Quem não tem código de barras grava o literal "SEM GTIN".
  if (!gtinAccepted(gtin)) {
    return {
      ok: false,
      message: `Este código de barras não é um GTIN válido. Confira os dígitos ou informe "${NO_GTIN}".`,
    };
  }

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

    ncm: ncm || null,
    cest: cest || null,
    origin: p.fiscal.origin === "" ? null : Number(p.fiscal.origin),
    gtin: gtin || null,
    tax_unit: p.fiscal.taxUnit.trim().toUpperCase() || null,
    cfop: cfop || null,
    icms_code: p.fiscal.icmsCode.trim() || null,
    pis_cst: p.fiscal.pisCst.trim() || null,
    cofins_cst: p.fiscal.cofinsCst.trim() || null,
  };

  const { data: saved, error } = p.id
    ? await supabase.from("products").update(fields).eq("id", p.id).select("id")
    : await supabase.from("products").insert({ tenant_id: tenantId, ...fields }).select("id");

  if (error) return { ok: false, message: error.message };

  await logActivity(supabase, p.id ? "product.updated" : "product.created", {
    entityId: saved?.[0]?.id ?? p.id ?? null,
    summary: fields.name,
  });

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

  // Pausar um produto some com ele do balcão: quem procurar depois precisa
  // achar quem o tirou de lá. Favoritar não entra no log — é arrumação de
  // tela, não decisão sobre o negócio.
  await logActivity(session.supabase, active ? "product.resumed" : "product.paused", {
    entityId: id,
  });

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

  // O nome é lido ANTES da exclusão, e é o único momento em que dá: depois do
  // delete não há de onde tirá-lo, e um histórico que diz "produto excluído"
  // sem dizer qual não serve para nada — justamente a linha mais importante do
  // log é a do que deixou de existir.
  const { data: produto } = await session.supabase
    .from("products")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  const { error } = await session.supabase.from("products").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message:
        "Este produto tem movimentações ligadas a ele e não pode ser excluído. Pause a venda para tirá-lo do balcão.",
    };
  }

  await logActivity(session.supabase, "product.deleted", {
    entityId: id,
    summary: produto?.name ?? null,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
