"use server";

import { revalidatePath } from "next/cache";
import { REGISTER_OPEN, REGISTER_CLOSED, REGISTER_MOVEMENT_DB } from "@/lib/dados/caixa";
import { requireCustomer, type ActionResult } from "@/lib/sessao";
import type { RegisterMovementType } from "@/types/types";

/**
 * Abre o turno com o troco que está na gaveta.
 *
 * Só pode haver um caixa aberto por vez — dois turnos simultâneos tornariam
 * impossível dizer a qual deles uma venda em dinheiro pertence.
 */
export async function openRegister(valorInicial: number): Promise<ActionResult> {
  const session = await requireCustomer("abrir o caixa");
  if (!session.ok) return session;
  const { supabase, tenantId, userId } = session;

  const { data: jaAberto } = await supabase
    .from("cash_registers")
    .select("id")
    .eq("status", REGISTER_OPEN)
    .maybeSingle();

  if (jaAberto) return { ok: false, message: "Já existe um caixa aberto." };

  const { error } = await supabase.from("cash_registers").insert({
    tenant_id: tenantId,
    opened_by: userId,
    opening_amount: valorInicial,
    status: REGISTER_OPEN,
    opened_at: new Date().toISOString(),
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function recordRegisterMovement(data: {
  registerId: string;
  type: RegisterMovementType;
  amount: number;
  reason: string;
}): Promise<ActionResult> {
  const session = await requireCustomer("movimentar o caixa");
  if (!session.ok) return session;

  if (!(data.amount > 0)) return { ok: false, message: "Informe um valor maior que zero." };

  const { supabase, tenantId, userId } = session;

  const { error } = await supabase.from("cash_movements").insert({
    tenant_id: tenantId,
    cash_register_id: data.registerId,
    user_id: userId,
    type: REGISTER_MOVEMENT_DB[data.type],
    amount: data.amount,
    reason: data.reason.trim() || null,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Reverter uma movimentação apaga a linha, ao contrário do estoque.
 *
 * Aqui é justificável: a gaveta não é um livro contábil, e uma sangria digitada
 * errada há dez segundos vira ruído permanente na conferência do turno. O
 * fechamento é que carimba o resultado.
 */
export async function undoRegisterMovement(movId: string): Promise<ActionResult> {
  const session = await requireCustomer("reverter uma movimentação");
  if (!session.ok) return session;

  const { error } = await session.supabase.from("cash_movements").delete().eq("id", movId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Fecha o turno conferindo o dinheiro em espécie.
 *
 * A conferência é só do dinheiro: Pix e cartão caem na conta, não na gaveta, e
 * são conferidos no extrato. Quem calcula o esperado e a diferença é a função
 * `close_cash_register`, no banco — a conta não pode depender do que o
 * navegador acha que sabe.
 */
export async function closeRegister(
  registerId: string,
  contadoEmDinheiro: number,
  observacao: string,
): Promise<ActionResult> {
  const session = await requireCustomer("fechar o caixa");
  if (!session.ok) return session;

  const { error } = await session.supabase.rpc("close_cash_register", {
    p_register_id: registerId,
    p_counted_cash: contadoEmDinheiro,
    p_note: observacao.trim() || null,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Fechou por engano: o turno volta a aceitar vendas e movimentações. */
export async function reopenRegister(registerId: string): Promise<ActionResult> {
  const session = await requireCustomer("reabrir o caixa");
  if (!session.ok) return session;
  const { supabase } = session;

  const { data: jaAberto } = await supabase
    .from("cash_registers")
    .select("id")
    .eq("status", REGISTER_OPEN)
    .maybeSingle();

  if (jaAberto) {
    return { ok: false, message: "Feche o caixa aberto antes de reabrir outro turno." };
  }

  const { error } = await supabase
    .from("cash_registers")
    .update({
      status: REGISTER_OPEN,
      closed_at: null,
      closed_by: null,
      counted_cash: null,
      expected_cash: null,
      difference: null,
    })
    .eq("id", registerId)
    .eq("status", REGISTER_CLOSED);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
