import "server-only";

import { requireAdmin } from "@/lib/autorizacao";
import type { MpAccountData, MpAccountResult } from "@/lib/recebimentos";

/**
 * A conta do Mercado Pago, lida pela Edge Function `mp-account`.
 *
 * O console NÃO guarda o Access Token do Mercado Pago, embora tenha a
 * service_role: a credencial vive num lugar só — os secrets das Edge
 * Functions —, e é lá que ela é girada. Aqui vai só a sessão do admin; a
 * função confere `is_platform_admin` antes de responder.
 */
export async function loadMercadoPago(days: number): Promise<MpAccountResult> {
  const auth = await requireAdmin("ver os recebimentos");
  if (!auth.ok) return { state: "error", message: auth.message };

  const { data, error } = await auth.supabase.functions.invoke("mp-account", { body: { days } });

  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    // 404 = a função ainda não foi publicada neste projeto.
    if (status === 404) return { state: "unconfigured" };
    console.error("[loadMercadoPago] falha ao chamar mp-account:", error.message);
    return { state: "error", message: "Não foi possível consultar o Mercado Pago agora." };
  }

  const body = data as ({ configured?: boolean; error?: string } & Partial<MpAccountData>) | null;
  if (!body || body.configured === false) return { state: "unconfigured" };
  if (body.error) return { state: "error", message: body.error };
  if (!body.account || !body.summary || !Array.isArray(body.payments)) {
    return { state: "error", message: "O Mercado Pago respondeu num formato inesperado." };
  }

  return { state: "ok", data: body as MpAccountData };
}
