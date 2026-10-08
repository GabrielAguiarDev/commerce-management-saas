"use server";

import { revalidatePath } from "next/cache";
import { toAttempt } from "@/lib/dados/assinatura";
import { logActivity } from "@/lib/historico";
import { requireOwner } from "@/lib/sessao";
import { platformPaymentsEnabled } from "@/lib/platformPayments";
import type { PaymentAttempt } from "@/types/types";

/**
 * O pagamento da mensalidade.
 *
 * Nenhuma destas ações fala com o Mercado Pago: este portal não guarda segredo
 * nenhum. Quem cria o Pix e cobra o cartão é a Edge Function
 * `billing-checkout`, chamada com a sessão do dono — o valor sai do banco lá
 * dentro, nunca daqui. O que estas ações fazem é exigir que seja o dono,
 * repassar e traduzir a resposta.
 */

export type AttemptResult =
  | { ok: true; attempt: PaymentAttempt }
  | { ok: false; message: string };

/** O que o formulário do Mercado Pago entrega depois de tokenizar o cartão. */
export interface CardInput {
  token: string;
  paymentMethodId: string;
  issuerId: string;
  payerEmail: string;
  docType: string;
  docNumber: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A mensagem que a Edge Function mandou, ou a genérica. */
async function functionMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const body: unknown = await context.clone().json();
      if (
        typeof body === "object" &&
        body !== null &&
        typeof (body as { error?: unknown }).error === "string"
      ) {
        const message = (body as { error: string }).error;
        return message.charAt(0).toUpperCase() + message.slice(1) + ".";
      }
    } catch {
      // Corpo não-JSON: fica a mensagem genérica.
    }
  }
  return fallback;
}

async function checkout(
  action: string,
  body: Record<string, unknown>,
  fallback: string,
): Promise<AttemptResult> {
  if (!platformPaymentsEnabled()) {
    return { ok: false, message: "Pagamentos pela plataforma estarão disponíveis em breve." };
  }
  const session = await requireOwner(action);
  if (!session.ok) return session;

  const { data, error } = await session.supabase.functions.invoke("billing-checkout", { body });
  if (error) return { ok: false, message: await functionMessage(error, fallback) };

  const attempt = toAttempt((data as { attempt?: unknown } | null)?.attempt);
  if (!attempt) return { ok: false, message: fallback };

  if (attempt.status === "approved") {
    await logActivity(session.supabase, "billing.paid", {
      entityId: attempt.chargeId,
      summary: attempt.method === "pix" ? "Mensalidade paga com Pix" : "Mensalidade paga com cartão",
      metadata: { attemptId: attempt.id, method: attempt.method, amount: attempt.amount },
    });
    // A cobrança mudou de estado: o retrato do layout precisa ser relido.
    revalidatePath("/", "layout");
  }

  return { ok: true, attempt };
}

/** Gera o Pix da cobrança — ou devolve o que ainda está valendo. */
export async function startPix(chargeId: string): Promise<AttemptResult> {
  if (!UUID_RE.test(chargeId)) return { ok: false, message: "Cobrança inválida." };
  return checkout(
    "pagar a mensalidade",
    { action: "pix", payment_id: chargeId },
    "Não foi possível gerar o Pix agora. Tente de novo em instantes.",
  );
}

/** Cobra o cartão que o Mercado Pago acabou de tokenizar no navegador. */
export async function payWithCard(chargeId: string, card: CardInput): Promise<AttemptResult> {
  if (!UUID_RE.test(chargeId)) return { ok: false, message: "Cobrança inválida." };
  if (!card.token || !card.paymentMethodId) {
    return { ok: false, message: "Confira os dados do cartão." };
  }

  return checkout(
    "pagar a mensalidade",
    {
      action: "card",
      payment_id: chargeId,
      token: card.token,
      payment_method_id: card.paymentMethodId,
      issuer_id: card.issuerId,
      payer: {
        email: card.payerEmail,
        identification: { type: card.docType, number: card.docNumber },
      },
    },
    "Não foi possível processar o cartão. Confira os dados e tente de novo.",
  );
}

/**
 * Pergunta como está uma tentativa. É o que a tela chama de tempos em tempos
 * enquanto o Pix não cai — e o que a mantém certa mesmo se o aviso do
 * Mercado Pago (webhook) atrasar.
 */
export async function syncAttempt(attemptId: string): Promise<AttemptResult> {
  if (!UUID_RE.test(attemptId)) return { ok: false, message: "Tentativa inválida." };
  return checkout(
    "consultar o pagamento",
    { action: "sync", attempt_id: attemptId },
    "Não foi possível consultar o pagamento.",
  );
}
