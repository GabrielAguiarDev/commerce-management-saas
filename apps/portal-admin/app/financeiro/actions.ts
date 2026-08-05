"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/autorizacao";

/**
 * Registro manual de pagamento em `platform_payments`.
 *
 * "Manual" é o modelo escolhido: não há cobrança automática, o admin marca o
 * que recebeu. A tela deixa isso explícito ("Registro manual — sem cobrança
 * automática").
 */

/** Primeiro dia do mês corrente, em `date` (aaaa-mm-dd) — é a granularidade da coluna. */
function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** "R$ 89,00" → 89. A lista guarda a mensalidade já formatada. */
function toNumber(amount: string): number {
  const n = Number(
    amount
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}\b)/g, "")
      .replace(",", "."),
  );
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Marca o mês corrente como pago para um cliente.
 *
 * Se já existe uma cobrança em aberto para o mês, ela é quitada; se não existe,
 * uma linha nasce já paga. Os dois caminhos existem porque não há rotina que
 * gere as cobranças do mês — sem o segundo, marcar um pagamento de um cliente
 * novo simplesmente não faria nada.
 */
export async function markPaid(customerId: string): Promise<ActionResult> {
  const auth = await requireAdmin("registrar pagamentos");
  if (!auth.ok) return auth;

  const reference = currentMonth();
  const now = new Date().toISOString();

  // A mensalidade vigente do cliente é a fonte do valor — não um número vindo
  // do navegador, que poderia ter sido adulterado.
  const { data: customer, error: erroCliente } = await auth.supabase
    .from("tenants")
    .select("monthly_fee")
    .eq("id", customerId)
    .single();

  if (erroCliente || !customer) return { ok: false, message: "Cliente não encontrado." };

  const amount = toNumber(String(customer.monthly_fee ?? 0));
  if (amount <= 0) {
    return { ok: false, message: "Este cliente não tem mensalidade a cobrar." };
  }

  const { data: existente } = await auth.supabase
    .from("platform_payments")
    .select("id")
    .eq("tenant_id", customerId)
    .eq("reference_month", reference)
    .maybeSingle();

  const { error } = existente
    ? await auth.supabase
        .from("platform_payments")
        .update({ status: "paid", paid_at: now })
        .eq("id", existente.id)
    : await auth.supabase.from("platform_payments").insert({
        tenant_id: customerId,
        amount: amount,
        reference_month: reference,
        status: "paid",
        paid_at: now,
      });

  if (error) {
    console.error("[marcarPago] falha:", error.message);
    return { ok: false, message: `Não foi possível registrar o pagamento: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Desfaz o último pagamento registrado: volta a linha para pendente e limpa a
 * data. A linha não é apagada — a cobrança do mês continua existindo, ela é
 * que deixa de estar quitada.
 */
export async function undoPaid(customerId: string): Promise<ActionResult> {
  const auth = await requireAdmin("reverter pagamentos");
  if (!auth.ok) return auth;

  const { data: latest, error: erroLeitura } = await auth.supabase
    .from("platform_payments")
    .select("id")
    .eq("tenant_id", customerId)
    .eq("status", "paid")
    .order("reference_month", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erroLeitura) {
    return { ok: false, message: `Não foi possível ler os pagamentos: ${erroLeitura.message}` };
  }
  if (!latest) return { ok: false, message: "Não há pagamento registrado para reverter." };

  const { error } = await auth.supabase
    .from("platform_payments")
    .update({ status: "pending", paid_at: null })
    .eq("id", latest.id);

  if (error) {
    console.error("[reverterPago] falha:", error.message);
    return { ok: false, message: `Não foi possível reverter: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
