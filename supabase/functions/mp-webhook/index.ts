import { json, serviceClient } from "../_shared/db.ts";
import { isUuid, mpConfigured, mpFetch, settle, type MpPayment } from "../_shared/mercadopago.ts";

/**
 * O aviso do Mercado Pago: "o pagamento X mudou".
 *
 * É a única função PÚBLICA do projeto — quem chama é o Mercado Pago, sem JWT.
 * Faça o deploy com `--no-verify-jwt`. Duas coisas a mantêm segura:
 *
 *   1. A assinatura (`x-signature`), conferida com `MP_WEBHOOK_SECRET`. Sem o
 *      secret configurado a função ainda aceita o aviso (para o primeiro
 *      deploy não nascer quebrado), mas registra no log que está sem a tranca.
 *   2. O AVISO NUNCA É A VERDADE. O corpo só traz um id; o estado do pagamento
 *      é buscado na API do Mercado Pago com o nosso token, e só quita uma
 *      cobrança se o `external_reference` dele for uma tentativa nossa. Um
 *      aviso forjado consegue, no máximo, provocar uma consulta.
 *
 * Responde 200 para tudo que não é para nós (outro tipo de evento, pagamento
 * que não nasceu no portal): qualquer outro status faz o Mercado Pago repetir
 * o aviso por dias.
 */

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparação em tempo constante — não revela quantos caracteres bateram. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Confere o `x-signature: ts=...,v1=...`.
 *
 * O manifesto é o do Mercado Pago, ao pé da letra:
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` — com o `data.id` em
 * minúsculas, e pulando o trecho de um valor que não veio.
 */
async function signatureValid(req: Request, dataId: string, secret: string): Promise<boolean> {
  const parts = new Map(
    (req.headers.get("x-signature") ?? "").split(",").map((part) => {
      const [k, ...v] = part.split("=");
      return [k.trim(), v.join("=").trim()] as const;
    }),
  );
  const ts = parts.get("ts");
  const v1 = parts.get("v1");
  if (!ts || !v1) return false;

  const requestId = req.headers.get("x-request-id");
  let manifest = `id:${dataId.toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;

  return safeEqual(await hmacHex(secret, manifest), v1.toLowerCase());
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  const url = new URL(req.url);
  let body: { type?: unknown; topic?: unknown; data?: { id?: unknown } } = {};
  try {
    body = await req.json();
  } catch {
    // O formato antigo (IPN) manda tudo na query, sem corpo.
  }

  const type = String(body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "");
  const dataId = String(
    url.searchParams.get("data.id") ?? body.data?.id ?? url.searchParams.get("id") ?? "",
  );

  if (type !== "payment" || !dataId) return json({ ignored: true });

  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (secret) {
    if (!(await signatureValid(req, dataId, secret))) {
      return json({ error: "assinatura inválida" }, 401);
    }
  } else {
    console.warn("[mp-webhook] MP_WEBHOOK_SECRET ausente: aviso aceito sem conferir a assinatura");
  }

  if (!mpConfigured()) return json({ error: "MP_ACCESS_TOKEN não configurado" }, 500);

  const mp = await mpFetch<MpPayment>(`/v1/payments/${encodeURIComponent(dataId)}`);
  if (mp.status === 404) return json({ ignored: true });
  // Mercado Pago indisponível: 500 faz ele avisar de novo mais tarde.
  if (!mp.ok || !mp.data) return json({ error: "pagamento indisponível no provedor" }, 500);

  // Pagamento que não nasceu no portal (um link de cobrança, outra integração
  // da mesma conta) não tem tentativa — e não é problema nosso.
  const reference = mp.data.external_reference;
  if (!isUuid(reference)) return json({ ignored: true });

  const admin = serviceClient();
  const { data: attempt, error } = await admin
    .from("platform_payment_attempts")
    .select("id, amount")
    .eq("id", reference)
    .maybeSingle();

  if (error) return json({ error: "banco indisponível" }, 500);
  if (!attempt) return json({ ignored: true });

  const settled = await settle(admin, attempt, mp.data);
  if ("error" in settled) return json({ error: settled.error }, 500);

  return json({ ok: true, status: settled.status });
});
