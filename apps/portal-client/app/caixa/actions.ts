"use server";

import { revalidatePath } from "next/cache";
import { CAIXA_ABERTO, CAIXA_FECHADO, MOV_CAIXA_DB } from "@/lib/dados/caixa";
import { exigirCliente, type ResultadoAcao } from "@/lib/sessao";
import type { TipoMovCaixa } from "@/types/types";

/**
 * Abre o turno com o troco que está na gaveta.
 *
 * Só pode haver um caixa aberto por vez — dois turnos simultâneos tornariam
 * impossível dizer a qual deles uma venda em dinheiro pertence.
 */
export async function abrirCaixa(valorInicial: number): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("abrir o caixa");
  if (!sessao.ok) return sessao;
  const { supabase, tenantId, usuarioId } = sessao;

  const { data: jaAberto } = await supabase
    .from("cash_registers")
    .select("id")
    .eq("status", CAIXA_ABERTO)
    .maybeSingle();

  if (jaAberto) return { ok: false, mensagem: "Já existe um caixa aberto." };

  const { error } = await supabase.from("cash_registers").insert({
    tenant_id: tenantId,
    opened_by: usuarioId,
    opening_amount: valorInicial,
    status: CAIXA_ABERTO,
    opened_at: new Date().toISOString(),
  });

  if (error) return { ok: false, mensagem: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function registrarMovimentacaoCaixa(dados: {
  caixaId: string;
  tipo: TipoMovCaixa;
  valor: number;
  motivo: string;
}): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("movimentar o caixa");
  if (!sessao.ok) return sessao;

  if (!(dados.valor > 0)) return { ok: false, mensagem: "Informe um valor maior que zero." };

  const { supabase, tenantId, usuarioId } = sessao;

  const { error } = await supabase.from("cash_movements").insert({
    tenant_id: tenantId,
    cash_register_id: dados.caixaId,
    user_id: usuarioId,
    type: MOV_CAIXA_DB[dados.tipo],
    amount: dados.valor,
    reason: dados.motivo.trim() || null,
  });

  if (error) return { ok: false, mensagem: error.message };

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
export async function reverterMovimentacaoCaixa(movId: string): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("reverter uma movimentação");
  if (!sessao.ok) return sessao;

  const { error } = await sessao.supabase.from("cash_movements").delete().eq("id", movId);
  if (error) return { ok: false, mensagem: error.message };

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
export async function fecharCaixa(
  caixaId: string,
  contadoEmDinheiro: number,
  observacao: string,
): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("fechar o caixa");
  if (!sessao.ok) return sessao;

  const { error } = await sessao.supabase.rpc("close_cash_register", {
    p_register_id: caixaId,
    p_counted_cash: contadoEmDinheiro,
    p_note: observacao.trim() || null,
  });

  if (error) return { ok: false, mensagem: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Fechou por engano: o turno volta a aceitar vendas e movimentações. */
export async function reabrirCaixa(caixaId: string): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("reabrir o caixa");
  if (!sessao.ok) return sessao;
  const { supabase } = sessao;

  const { data: jaAberto } = await supabase
    .from("cash_registers")
    .select("id")
    .eq("status", CAIXA_ABERTO)
    .maybeSingle();

  if (jaAberto) {
    return { ok: false, mensagem: "Feche o caixa aberto antes de reabrir outro turno." };
  }

  const { error } = await supabase
    .from("cash_registers")
    .update({
      status: CAIXA_ABERTO,
      closed_at: null,
      closed_by: null,
      counted_cash: null,
      expected_cash: null,
      difference: null,
    })
    .eq("id", caixaId)
    .eq("status", CAIXA_FECHADO);

  if (error) return { ok: false, mensagem: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
