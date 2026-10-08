import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireOwner: vi.fn(),
  logActivity: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/sessao", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/lib/historico", () => ({ logActivity: mocks.logActivity }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { payWithCard, startPix, syncAttempt } from "./actions";

const CHARGE = "f3000000-0000-4000-8000-000000000001";
const ATTEMPT = "f3000000-0000-4000-8000-000000000002";

function owner(invoke: unknown) {
  return { ok: true, supabase: { functions: { invoke } }, userId: "user-1", tenantId: "tenant-1" };
}

function attemptRow(status: string, method = "pix") {
  return { id: ATTEMPT, payment_id: CHARGE, method, status, amount: 89.9 };
}

describe("billing Server Actions", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_PLATFORM_PAYMENTS_ENABLED", "true");
    mocks.requireOwner.mockReset();
    mocks.logActivity.mockReset().mockResolvedValue(undefined);
    mocks.revalidatePath.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([undefined, "false", "TRUE"])("blocks every checkout action when release is %s", async (release) => {
    vi.stubEnv("NEXT_PUBLIC_PLATFORM_PAYMENTS_ENABLED", release);
    vi.stubEnv("NEXT_PUBLIC_MP_PUBLIC_KEY", "configured-public-key");
    const invoke = vi.fn();
    mocks.requireOwner.mockResolvedValue(owner(invoke));
    const blocked = { ok: false, message: "Pagamentos pela plataforma estarão disponíveis em breve." };

    await expect(startPix(CHARGE)).resolves.toEqual(blocked);
    await expect(syncAttempt(ATTEMPT)).resolves.toEqual(blocked);
    await expect(payWithCard(CHARGE, {
      token: "tokenized-card", paymentMethodId: "visa", issuerId: "1",
      payerEmail: "owner@example.com", docType: "CPF", docNumber: "12345678901",
    })).resolves.toEqual(blocked);
    expect(invoke).not.toHaveBeenCalled();
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });

  it("refuses anyone who is not the owner before calling the function", async () => {
    mocks.requireOwner.mockResolvedValue({ ok: false, message: "Você não tem permissão." });

    await expect(startPix(CHARGE)).resolves.toEqual({ ok: false, message: "Você não tem permissão." });
  });

  it("never sends an amount: the function reads it from the charge", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { attempt: attemptRow("pending") }, error: null });
    mocks.requireOwner.mockResolvedValue(owner(invoke));

    const result = await startPix(CHARGE);

    expect(invoke).toHaveBeenCalledWith("billing-checkout", {
      body: { action: "pix", payment_id: CHARGE },
    });
    expect(result).toMatchObject({ ok: true, attempt: { status: "pending", chargeId: CHARGE } });
    // Pix gerado ainda não é pagamento: nada a registrar nem a reler.
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.logActivity).not.toHaveBeenCalled();
  });

  it("refreshes the portal and logs once the provider approves", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { attempt: attemptRow("approved") }, error: null });
    mocks.requireOwner.mockResolvedValue(owner(invoke));

    await expect(syncAttempt(ATTEMPT)).resolves.toMatchObject({ ok: true });

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.anything(),
      "billing.paid",
      expect.objectContaining({ entityId: CHARGE }),
    );
  });

  it("surfaces the message the function returned", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: { context: new Response(JSON.stringify({ error: "esta mensalidade já está paga" }), { status: 409 }) },
    });
    mocks.requireOwner.mockResolvedValue(owner(invoke));

    await expect(startPix(CHARGE)).resolves.toEqual({
      ok: false,
      message: "Esta mensalidade já está paga.",
    });
  });

  it("rejects malformed ids and an untokenized card without a round trip", async () => {
    await expect(startPix("1 or 1=1")).resolves.toMatchObject({ ok: false });
    await expect(syncAttempt("nope")).resolves.toMatchObject({ ok: false });
    await expect(
      payWithCard(CHARGE, {
        token: "",
        paymentMethodId: "visa",
        issuerId: "",
        payerEmail: "a@b.co",
        docType: "CPF",
        docNumber: "1",
      }),
    ).resolves.toMatchObject({ ok: false });
    expect(mocks.requireOwner).not.toHaveBeenCalled();
  });
});
