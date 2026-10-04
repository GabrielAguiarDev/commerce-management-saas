import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

/**
 * O cliente do Mercado Pago das Edge Functions de cobrança.
 *
 * O `MP_ACCESS_TOKEN` vive SÓ aqui, como secret das funções. Nenhum dos dois
 * portais o conhece: o do cliente não guarda segredo nenhum por princípio, e o
 * console pergunta à `mp-account` em vez de falar com o Mercado Pago direto —
 * um lugar só para girar a credencial.
 */

const API = "https://api.mercadopago.com";

export type AttemptStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired"
  | "refunded";

/** Só os campos de `/v1/payments` que as funções leem. */
export interface MpPayment {
  id: number | string;
  status: string;
  status_detail?: string | null;
  external_reference?: string | null;
  description?: string | null;
  currency_id?: string | null;
  transaction_amount?: number | null;
  transaction_amount_refunded?: number | null;
  payment_method_id?: string | null;
  payment_type_id?: string | null;
  date_created?: string | null;
  date_approved?: string | null;
  date_of_expiration?: string | null;
  money_release_date?: string | null;
  money_release_status?: string | null;
  live_mode?: boolean | null;
  fee_details?: { type?: string; amount?: number; fee_payer?: string }[] | null;
  transaction_details?: { net_received_amount?: number | null } | null;
  card?: { last_four_digits?: string | null } | null;
  payer?: { email?: string | null } | null;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string | null;
      qr_code_base64?: string | null;
      ticket_url?: string | null;
    } | null;
  } | null;
}

export function mpConfigured(): boolean {
  return !!Deno.env.get("MP_ACCESS_TOKEN");
}

/** Credencial de teste? O painel avisa, para ninguém confundir com dinheiro de verdade. */
export function mpSandbox(): boolean {
  return (Deno.env.get("MP_ACCESS_TOKEN") ?? "").startsWith("TEST-");
}

export interface MpResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  /** A mensagem do Mercado Pago quando ele recusa — para o log, não para a tela. */
  message: string | null;
}

export async function mpFetch<T>(
  path: string,
  init: { method?: string; body?: unknown; idempotencyKey?: string } = {},
): Promise<MpResponse<T>> {
  const token = Deno.env.get("MP_ACCESS_TOKEN");
  if (!token) throw new Error("Falta MP_ACCESS_TOKEN na função.");

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch (e) {
    return { ok: false, status: 0, data: null, message: e instanceof Error ? e.message : "rede" };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Corpo vazio ou não-JSON: fica `null`, e o status conta a história.
  }

  const message = res.ok
    ? null
    : typeof data === "object" && data !== null && "message" in data
      ? String((data as { message: unknown }).message)
      : `HTTP ${res.status}`;

  return { ok: res.ok, status: res.status, data: res.ok ? (data as T) : null, message };
}

/**
 * O status do Mercado Pago no vocabulário da tentativa.
 *
 * `in_process` e `authorized` continuam `pending`: o cartão está em análise e a
 * resposta definitiva chega pelo webhook. Um Pix que passou do prazo vira
 * `expired` mesmo que o Mercado Pago ainda não o tenha cancelado — ele não
 * pode mais ser pago, e a tela precisa oferecer um novo.
 */
export function attemptStatus(payment: MpPayment): AttemptStatus {
  switch (payment.status) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "refunded":
    case "charged_back":
      return "refunded";
    case "cancelled":
      return payment.status_detail === "expired" ? "expired" : "cancelled";
    default: {
      const expires = payment.date_of_expiration ? Date.parse(payment.date_of_expiration) : NaN;
      if (payment.payment_method_id === "pix" && Number.isFinite(expires) && expires < Date.now()) {
        return "expired";
      }
      return "pending";
    }
  }
}

/** Soma das tarifas que saíram do bolso de quem recebe. */
export function feeTotal(payment: MpPayment): number {
  const total = (payment.fee_details ?? [])
    .filter((f) => !f.fee_payer || f.fee_payer === "collector")
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  return Math.round(total * 100) / 100;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Leva para o banco o que o Mercado Pago respondeu sobre UMA tentativa.
 *
 * É o único caminho que quita uma cobrança, e ele só confia em `payment` — que
 * quem chama acabou de buscar na API do Mercado Pago com o nosso token. O
 * corpo de um webhook ou de uma requisição do navegador nunca chega aqui.
 *
 * `admin` precisa ser o cliente de serviço: `apply_provider_payment` não tem
 * EXECUTE para mais ninguém.
 */
export async function settle(
  admin: SupabaseClient,
  attempt: { id: string; amount: number | string },
  payment: MpPayment,
): Promise<{ status: AttemptStatus } | { error: string }> {
  // A tentativa é nossa se o pagamento a cita. Sem isso, um id de pagamento
  // alheio (de outra cobrança, de outro negócio) poderia quitar esta.
  if (payment.external_reference !== attempt.id) {
    return { error: "pagamento não pertence a esta tentativa" };
  }

  let status = attemptStatus(payment);

  // Aprovado por menos do que a cobrança não quita. Não acontece no fluxo
  // normal — o valor sai do banco, não do navegador —, mas é a conferência
  // que impede uma surpresa de virar mensalidade paga.
  if (status === "approved") {
    const paid = Number(payment.transaction_amount ?? 0);
    const due = Number(attempt.amount);
    if (payment.currency_id !== "BRL" || paid + 0.005 < due) {
      console.error("[billing] valor divergente", { attempt: attempt.id, paid, due });
      status = "pending";
    }
  }

  const { data, error } = await admin.rpc("apply_provider_payment", {
    p_attempt_id: attempt.id,
    p_provider_payment_id: String(payment.id),
    p_status: status,
    p_provider_status: payment.status,
    p_status_detail: payment.status_detail ?? null,
    p_fee_amount: status === "approved" ? feeTotal(payment) : null,
    p_net_amount:
      status === "approved" ? (payment.transaction_details?.net_received_amount ?? null) : null,
    p_approved_at: payment.date_approved ?? null,
    p_release_date: payment.money_release_date ?? null,
    p_card_brand: payment.payment_type_id === "bank_transfer" ? null : (payment.payment_method_id ?? null),
    p_card_last4: payment.card?.last_four_digits ?? null,
  });

  if (error) {
    console.error("[billing] apply_provider_payment falhou:", error.message);
    return { error: "não foi possível registrar o pagamento" };
  }

  return { status: (data as AttemptStatus) ?? status };
}

/**
 * Data no formato que o Mercado Pago aceita em `date_of_expiration`:
 * `2026-10-03T16:30:00.000-03:00`. O `toISOString()` termina em `Z`, que a API
 * de pagamentos recusa nesse campo.
 */
export function mpDate(date: Date): string {
  const brt = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().replace("Z", "-03:00");
}
