import { json, serviceClient, userClient } from "../_shared/db.ts";
import { platformPaymentsEnabled } from "../_shared/platformPayments.ts";
import {
  isUuid,
  mpConfigured,
  mpDate,
  mpFetch,
  settle,
  type MpPayment,
} from "../_shared/mercadopago.ts";

/**
 * O pagamento da mensalidade, pedido pelo portal do cliente.
 *
 * Três ações, todas com a sessão do DONO do negócio:
 *
 *   - `pix`   gera (ou devolve o que ainda vale) um Pix para a cobrança;
 *   - `card`  cobra o cartão já tokenizado pelo Mercado Pago no navegador;
 *   - `sync`  pergunta ao Mercado Pago como está uma tentativa — é o que a
 *             tela chama enquanto espera o Pix, e o que faz o portal funcionar
 *             mesmo se o webhook atrasar ou estiver mal configurado.
 *
 * O VALOR NUNCA VEM DO NAVEGADOR: sai da linha de `platform_payments`, lida
 * com o JWT de quem chamou — a policy de leitura do dono é a prova de que a
 * cobrança é dele. Só depois a chave de serviço entra, para gravar a tentativa.
 */

type Body =
  | { action: "pix"; payment_id?: unknown }
  | {
      action: "card";
      payment_id?: unknown;
      token?: unknown;
      payment_method_id?: unknown;
      issuer_id?: unknown;
      installments?: unknown;
      payer?: { email?: unknown; identification?: { type?: unknown; number?: unknown } };
    }
  | { action: "sync"; attempt_id?: unknown };

/** Quanto tempo um Pix gerado continua pagável. */
const PIX_MINUTES = 30;
/** Um Pix com menos que isto de vida não é reaproveitado: gera-se outro. */
const PIX_MIN_REMAINING_MS = 2 * 60 * 1000;

// Uma string literal só: concatenada, o supabase-js não consegue tipar a linha.
const ATTEMPT_COLUMNS =
  "id, payment_id, method, amount, status, provider_payment_id, provider_status_detail, pix_code, pix_qr_base64, ticket_url, expires_at, card_brand, card_last4, created_at";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** "2026-10-01" → "10/2026", para a descrição que aparece no extrato de quem paga. */
function monthLabel(referenceMonth: string): string {
  const [year, month] = referenceMonth.split("-");
  return `${month}/${year}`;
}

/** Para onde o Mercado Pago avisa. Só https: em desenvolvimento local não há o que avisar. */
function notificationUrl(): string | undefined {
  const explicit = Deno.env.get("MP_NOTIFICATION_URL");
  if (explicit) return explicit;
  const base = Deno.env.get("SUPABASE_URL") ?? "";
  return base.startsWith("https://") ? `${base}/functions/v1/mp-webhook` : undefined;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "sessão obrigatória" }, 401);

  if (!platformPaymentsEnabled() || !mpConfigured()) {
    return json({ error: "pagamento pelo portal ainda não está disponível" }, 503);
  }

  const caller = userClient(authHeader);
  const [{ data: auth }, { data: owner, error: ownerError }] = await Promise.all([
    caller.auth.getUser(),
    caller.rpc("current_actor_is_owner"),
  ]);

  if (!auth.user || ownerError || owner !== true) {
    return json({ error: "operação permitida apenas ao dono do negócio" }, 403);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }

  const admin = serviceClient();

  // ─── sync ───────────────────────────────────────────────────────────
  if (body.action === "sync") {
    if (!isUuid(body.attempt_id)) return json({ error: "tentativa inválida" }, 400);

    // Lida com o JWT do dono: se o RLS não devolve, não é dele.
    const { data: attempt } = await caller
      .from("platform_payment_attempts")
      .select(ATTEMPT_COLUMNS)
      .eq("id", body.attempt_id)
      .maybeSingle();

    if (!attempt) return json({ error: "tentativa não encontrada" }, 404);

    // Estado final não muda mais por consulta; e sem id do provedor não há o
    // que perguntar.
    if (attempt.status !== "pending" || !attempt.provider_payment_id) {
      return json({ attempt });
    }

    const mp = await mpFetch<MpPayment>(`/v1/payments/${attempt.provider_payment_id}`);
    if (!mp.ok || !mp.data) {
      // O Mercado Pago fora do ar não é erro da pessoa: a tela segue esperando.
      return json({ attempt });
    }

    await settle(admin, attempt, mp.data);

    const { data: fresh } = await caller
      .from("platform_payment_attempts")
      .select(ATTEMPT_COLUMNS)
      .eq("id", attempt.id)
      .maybeSingle();

    return json({ attempt: fresh ?? attempt });
  }

  if (body.action !== "pix" && body.action !== "card") {
    return json({ error: "ação desconhecida" }, 400);
  }

  // ─── a cobrança ─────────────────────────────────────────────────────
  if (!isUuid(body.payment_id)) return json({ error: "cobrança inválida" }, 400);

  const { data: charge } = await caller
    .from("platform_payments")
    .select("id, tenant_id, amount, reference_month, status")
    .eq("id", body.payment_id)
    .maybeSingle();

  if (!charge) return json({ error: "cobrança não encontrada" }, 404);
  if (charge.status === "paid") return json({ error: "esta mensalidade já está paga" }, 409);

  const amount = Number(charge.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return json({ error: "cobrança sem valor a pagar" }, 400);
  }

  const { data: tenant } = await admin
    .from("tenants")
    .select("name")
    .eq("id", charge.tenant_id)
    .maybeSingle();

  const description = `Aguiar One - mensalidade ${monthLabel(charge.reference_month)}`;
  const accountEmail = auth.user.email ?? "";

  // ─── pix ────────────────────────────────────────────────────────────
  if (body.action === "pix") {
    // Um Pix ainda válido é devolvido como está: reabrir a tela não pode
    // espalhar meia dúzia de QR codes para a mesma mensalidade.
    const { data: existing } = await caller
      .from("platform_payment_attempts")
      .select(ATTEMPT_COLUMNS)
      .eq("payment_id", charge.id)
      .eq("method", "pix")
      .eq("status", "pending")
      .not("pix_code", "is", null)
      .gt("expires_at", new Date(Date.now() + PIX_MIN_REMAINING_MS).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) return json({ attempt: existing });

    if (!accountEmail) return json({ error: "sua conta não tem e-mail para o recibo" }, 400);

    const { data: created, error: createError } = await admin
      .from("platform_payment_attempts")
      .insert({
        payment_id: charge.id,
        tenant_id: charge.tenant_id,
        created_by: auth.user.id,
        method: "pix",
        amount,
      })
      .select("id")
      .single();

    if (createError || !created) {
      console.error("[billing-checkout] tentativa não criada:", createError?.message);
      return json({ error: "não foi possível iniciar o pagamento" }, 500);
    }

    const expiresAt = new Date(Date.now() + PIX_MINUTES * 60 * 1000);

    const mp = await mpFetch<MpPayment>("/v1/payments", {
      method: "POST",
      // A própria tentativa é a chave: repetir a chamada devolve o mesmo Pix.
      idempotencyKey: created.id,
      body: {
        transaction_amount: amount,
        description,
        payment_method_id: "pix",
        date_of_expiration: mpDate(expiresAt),
        external_reference: created.id,
        notification_url: notificationUrl(),
        payer: { email: accountEmail, first_name: tenant?.name ?? undefined },
        metadata: { tenant_id: charge.tenant_id, charge_id: charge.id },
      },
    });

    const tx = mp.data?.point_of_interaction?.transaction_data;
    if (!mp.ok || !mp.data || !tx?.qr_code) {
      console.error("[billing-checkout] Pix recusado pelo Mercado Pago:", mp.status, mp.message);
      // Nada nasceu no provedor: a tentativa não tem por que existir.
      await admin.from("platform_payment_attempts").delete().eq("id", created.id);
      return json({ error: "não foi possível gerar o Pix agora" }, 502);
    }

    const { data: saved, error: saveError } = await admin
      .from("platform_payment_attempts")
      .update({
        provider_payment_id: String(mp.data.id),
        provider_status: mp.data.status,
        provider_status_detail: mp.data.status_detail ?? null,
        pix_code: tx.qr_code,
        pix_qr_base64: tx.qr_code_base64 ?? null,
        ticket_url: tx.ticket_url ?? null,
        expires_at: mp.data.date_of_expiration ?? expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", created.id)
      .select(ATTEMPT_COLUMNS)
      .single();

    if (saveError || !saved) {
      console.error("[billing-checkout] Pix gerado mas não gravado:", saveError?.message);
      return json({ error: "não foi possível gerar o Pix agora" }, 500);
    }

    return json({ attempt: saved });
  }

  // ─── cartão ─────────────────────────────────────────────────────────
  const token = text(body.token);
  const methodId = text(body.payment_method_id);
  const payerEmail = text(body.payer?.email) || accountEmail;
  const docType = text(body.payer?.identification?.type);
  const docNumber = text(body.payer?.identification?.number).replace(/\D/g, "");

  if (!token || !methodId) return json({ error: "dados do cartão incompletos" }, 400);
  if (!payerEmail) return json({ error: "informe o e-mail do titular" }, 400);

  const { data: created, error: createError } = await admin
    .from("platform_payment_attempts")
    .insert({
      payment_id: charge.id,
      tenant_id: charge.tenant_id,
      created_by: auth.user.id,
      method: "card",
      amount,
      card_brand: methodId,
    })
    .select("id")
    .single();

  if (createError || !created) {
    console.error("[billing-checkout] tentativa não criada:", createError?.message);
    return json({ error: "não foi possível iniciar o pagamento" }, 500);
  }

  const issuer = Number(body.issuer_id);

  const mp = await mpFetch<MpPayment>("/v1/payments", {
    method: "POST",
    idempotencyKey: created.id,
    body: {
      transaction_amount: amount,
      description,
      token,
      payment_method_id: methodId,
      issuer_id: Number.isFinite(issuer) && issuer > 0 ? issuer : undefined,
      // Mensalidade é à vista: o parcelamento que o navegador mandar é ignorado.
      installments: 1,
      statement_descriptor: "AGUIAR ONE",
      external_reference: created.id,
      notification_url: notificationUrl(),
      payer: {
        email: payerEmail,
        identification: docType && docNumber ? { type: docType, number: docNumber } : undefined,
      },
      metadata: { tenant_id: charge.tenant_id, charge_id: charge.id },
    },
  });

  if (!mp.ok || !mp.data) {
    console.error("[billing-checkout] cartão recusado na criação:", mp.status, mp.message);
    await admin.from("platform_payment_attempts").delete().eq("id", created.id);
    return json({ error: "não foi possível processar o cartão. Confira os dados e tente de novo" }, 502);
  }

  const settled = await settle(admin, { id: created.id, amount }, mp.data);
  if ("error" in settled) return json({ error: settled.error }, 500);

  const { data: saved } = await caller
    .from("platform_payment_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("id", created.id)
    .maybeSingle();

  return json({ attempt: saved });
});
