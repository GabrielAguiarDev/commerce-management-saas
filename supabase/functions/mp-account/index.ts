import { json, serviceClient, userClient } from "../_shared/db.ts";
import {
  feeTotal,
  isUuid,
  mpConfigured,
  mpFetch,
  mpSandbox,
  type MpPayment,
} from "../_shared/mercadopago.ts";

/**
 * O retrato da conta do Mercado Pago, para o console admin.
 *
 * Só leitura, e só para admin de plataforma. Junta três coisas:
 *
 *   - quem é a conta (`/users/me`);
 *   - os pagamentos do período (`/v1/payments/search`), com tarifa, líquido e
 *     data de liberação de cada um — e, quando o pagamento nasceu no portal,
 *     de qual cliente ele é;
 *   - o saldo, QUANDO o Mercado Pago deixa ler.
 *
 * SOBRE O SALDO: `/users/{id}/mercadopago_account/balance` está em
 * descontinuação e a maioria das contas recebe 403. A função tenta; se não
 * vier, `balance` vai `null` e o painel mostra a estimativa calculada dos
 * pagamentos (aprovado líquido já liberado × a liberar). A estimativa não
 * enxerga saques nem gastos da conta — o número oficial é o do app do
 * Mercado Pago.
 */

interface MpUser {
  id: number;
  nickname?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  site_id?: string;
  country_id?: string;
}

interface MpBalance {
  available_balance?: number;
  unavailable_balance?: number;
  total_amount?: number;
  currency_id?: string;
}

interface MpSearch {
  paging?: { total?: number; limit?: number; offset?: number };
  results?: MpPayment[];
}

const PAGE = 100;
/** Teto de pagamentos lidos por consulta — cinco idas à API no pior caso. */
const MAX_PAYMENTS = 500;
const PERIODS = [7, 30, 90];

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "sessão obrigatória" }, 401);

  const caller = userClient(authHeader);
  const [{ data: auth }, { data: isAdmin, error: adminError }] = await Promise.all([
    caller.auth.getUser(),
    caller.rpc("is_platform_admin"),
  ]);

  if (!auth.user || adminError || isAdmin !== true) {
    return json({ error: "operação permitida apenas ao administrador da plataforma" }, 403);
  }

  if (!mpConfigured()) return json({ configured: false });

  let days = 30;
  try {
    const body = (await req.json()) as { days?: unknown };
    if (PERIODS.includes(Number(body.days))) days = Number(body.days);
  } catch {
    // Sem corpo: período padrão.
  }

  const me = await mpFetch<MpUser>("/users/me");
  if (!me.ok || !me.data) {
    return json({
      configured: true,
      error:
        me.status === 401
          ? "O Mercado Pago recusou a credencial (MP_ACCESS_TOKEN inválido ou expirado)."
          : "Não foi possível falar com o Mercado Pago agora.",
    });
  }

  // Saldo e a primeira página de pagamentos viajam juntos.
  const search = (offset: number) =>
    mpFetch<MpSearch>(
      "/v1/payments/search?sort=date_created&criteria=desc&range=date_created" +
        `&begin_date=NOW-${days}DAYS&end_date=NOW&limit=${PAGE}&offset=${offset}`,
    );

  const [balanceRes, first] = await Promise.all([
    mpFetch<MpBalance>(`/users/${me.data.id}/mercadopago_account/balance`),
    search(0),
  ]);

  if (!first.ok || !first.data) {
    return json({ configured: true, error: "Não foi possível ler os pagamentos do Mercado Pago." });
  }

  const payments: MpPayment[] = [...(first.data.results ?? [])];
  const total = first.data.paging?.total ?? payments.length;
  while (payments.length < Math.min(total, MAX_PAYMENTS)) {
    const next = await search(payments.length);
    const rows = next.data?.results ?? [];
    if (!next.ok || rows.length === 0) break;
    payments.push(...rows);
  }

  // ─── De qual cliente é cada pagamento ───────────────────────────────
  const references = [
    ...new Set(payments.map((p) => p.external_reference).filter(isUuid)),
  ];
  const tenantByAttempt = new Map<string, { tenantId: string; tenantName: string; month: string | null }>();

  if (references.length) {
    const admin = serviceClient();
    const { data: attempts } = await admin
      .from("platform_payment_attempts")
      .select("id, tenant_id, tenants(name), platform_payments(reference_month)")
      .in("id", references);

    for (const row of attempts ?? []) {
      const tenant = (Array.isArray(row.tenants) ? row.tenants[0] : row.tenants) as { name?: string } | null;
      const charge = (Array.isArray(row.platform_payments) ? row.platform_payments[0] : row.platform_payments) as
        | { reference_month?: string }
        | null;
      tenantByAttempt.set(row.id, {
        tenantId: row.tenant_id,
        tenantName: tenant?.name ?? "",
        month: charge?.reference_month ?? null,
      });
    }
  }

  // ─── Resumo do período ──────────────────────────────────────────────
  const now = Date.now();
  const summary = {
    gross: 0,
    fees: 0,
    net: 0,
    released: 0,
    toRelease: 0,
    refunded: 0,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    refundedCount: 0,
    pix: 0,
    card: 0,
  };

  const rows = payments.map((p) => {
    const amount = Number(p.transaction_amount ?? 0);
    const fee = feeTotal(p);
    const net = Number(p.transaction_details?.net_received_amount ?? 0);
    const isPix = p.payment_method_id === "pix";
    const release = p.money_release_date ? Date.parse(p.money_release_date) : NaN;
    const released =
      p.money_release_status === "released" || (Number.isFinite(release) && release <= now);

    if (p.status === "approved") {
      summary.approvedCount++;
      summary.gross += amount;
      summary.fees += fee;
      summary.net += net;
      if (released) summary.released += net;
      else summary.toRelease += net;
      if (isPix) summary.pix += amount;
      else summary.card += amount;
    } else if (p.status === "refunded" || p.status === "charged_back") {
      summary.refundedCount++;
      summary.refunded += Number(p.transaction_amount_refunded ?? amount);
    } else if (p.status === "rejected" || p.status === "cancelled") {
      summary.rejectedCount++;
    } else {
      summary.pendingCount++;
    }

    const owner = isUuid(p.external_reference) ? tenantByAttempt.get(p.external_reference) : undefined;

    return {
      id: String(p.id),
      createdAt: p.date_created ?? null,
      approvedAt: p.date_approved ?? null,
      status: p.status,
      statusDetail: p.status_detail ?? null,
      method: isPix ? "pix" : p.payment_type_id === "credit_card" || p.payment_type_id === "debit_card" ? "card" : "other",
      methodId: p.payment_method_id ?? null,
      amount,
      fee,
      net,
      releaseDate: p.money_release_date ?? null,
      released,
      description: p.description ?? null,
      payerEmail: p.payer?.email ?? null,
      tenantId: owner?.tenantId ?? null,
      tenantName: owner?.tenantName ?? null,
      referenceMonth: owner?.month ?? null,
      liveMode: p.live_mode !== false,
    };
  });

  for (const key of ["gross", "fees", "net", "released", "toRelease", "refunded", "pix", "card"] as const) {
    summary[key] = round(summary[key]);
  }

  const balance =
    balanceRes.ok && balanceRes.data && typeof balanceRes.data.available_balance === "number"
      ? {
          available: round(balanceRes.data.available_balance),
          unavailable: round(Number(balanceRes.data.unavailable_balance ?? 0)),
          total: round(Number(balanceRes.data.total_amount ?? 0)),
        }
      : null;

  return json({
    configured: true,
    sandbox: mpSandbox(),
    days,
    account: {
      id: String(me.data.id),
      nickname: me.data.nickname ?? "",
      email: me.data.email ?? "",
      name: [me.data.first_name, me.data.last_name].filter(Boolean).join(" "),
      country: me.data.country_id ?? me.data.site_id ?? "",
    },
    balance,
    summary,
    payments: rows,
    truncated: total > payments.length,
    total,
  });
});
