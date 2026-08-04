"use server";

import { revalidatePath } from "next/cache";
import { ORIGEM_ESTOQUE, TIPO_CUSTO_DB } from "@/lib/dados/custos";
import { MOV_DB } from "@/lib/dados/estoque";
import { exigirCliente, type ResultadoAcao } from "@/lib/sessao";
import type { TipoMovEstoque } from "@/types/types";

/**
 * Registra uma movimentação de estoque.
 *
 * `quantidade` chega no sentido do formulário — sempre positiva. Quem decide o
 * sinal é aqui, porque `apply_stock_movement` SOMA o que recebe:
 *
 *   entrada → +q          saída → −q          ajuste → (contagem − saldo atual)
 *
 * O ajuste é o único que fala em saldo final: quem conta a prateleira lê o
 * total, não a diferença.
 */
export async function registrarMovimentacao(dados: {
  produtoId: string;
  tipo: TipoMovEstoque;
  quantidade: number;
  custoUnitario: number;
  motivo: string;
}): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("movimentar o estoque");
  if (!sessao.ok) return sessao;

  const { supabase, tenantId, usuarioId } = sessao;
  const { produtoId, tipo, quantidade, custoUnitario, motivo } = dados;

  if (!produtoId) return { ok: false, mensagem: "Escolha o produto." };
  if (!(quantidade >= 0)) return { ok: false, mensagem: "Informe a quantidade." };

  const { data: produto } = await supabase
    .from("products")
    .select("id, name, stock_quantity, tracks_stock")
    .eq("id", produtoId)
    .single();

  if (!produto?.tracks_stock) {
    return { ok: false, mensagem: "Este produto não controla estoque." };
  }

  const saldo = Number(produto.stock_quantity ?? 0);
  const delta =
    tipo === "entrada" ? quantidade : tipo === "saida" ? -quantidade : quantidade - saldo;

  if (delta === 0) return { ok: true };

  const { error } = await supabase.rpc("apply_stock_movement", {
    p_product_id: produtoId,
    p_type: MOV_DB[tipo],
    p_quantity: delta,
    p_reason: motivo.trim() || null,
    p_sale_id: null,
    p_unit_cost: custoUnitario || null,
  });

  if (error) return { ok: false, mensagem: error.message };

  // A função grava o movimento e ajusta o saldo, mas NÃO mexe no custo do
  // produto nem lança a despesa. Compra de mercadoria é dinheiro que saiu:
  // as duas coisas são feitas aqui.
  if (tipo === "entrada" && custoUnitario > 0) {
    await supabase.from("products").update({ cost: custoUnitario }).eq("id", produtoId);

    await supabase.from("costs").insert({
      tenant_id: tenantId,
      user_id: usuarioId,
      description: `Compra — ${produto.name}`,
      type: TIPO_CUSTO_DB.variavel,
      category: "Materiais",
      amount: Math.round(custoUnitario * quantidade * 100) / 100,
      is_recurring: false,
      origin: ORIGEM_ESTOQUE,
      cost_date: hojeISO(),
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Reverte uma movimentação lançada à mão.
 *
 * Não apaga a linha: grava o movimento contrário. O estoque é um livro-caixa —
 * apagar o passado esconderia por que o saldo mudou. Baixa por venda não passa
 * por aqui; quem a desfaz é o estorno da venda.
 */
export async function reverterMovimentacao(movId: string): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("reverter uma movimentação");
  if (!sessao.ok) return sessao;
  const { supabase } = sessao;

  const { data: mov } = await supabase
    .from("stock_movements")
    .select("id, product_id, quantity, type, sale_id")
    .eq("id", movId)
    .single();

  if (!mov) return { ok: false, mensagem: "Movimentação não encontrada." };
  if (mov.sale_id) {
    return { ok: false, mensagem: "Baixa por venda se desfaz estornando a venda." };
  }

  const { error } = await supabase.rpc("apply_stock_movement", {
    p_product_id: mov.product_id,
    p_type: MOV_DB.ajuste,
    p_quantity: -Number(mov.quantity),
    p_reason: "Reversão de movimentação",
    p_sale_id: null,
    p_unit_cost: null,
  });

  if (error) return { ok: false, mensagem: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
