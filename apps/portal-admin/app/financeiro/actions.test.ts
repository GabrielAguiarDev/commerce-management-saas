import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/autorizacao", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { markPaid, undoPaid } from "./actions";

function admin(supabase: unknown) {
  return { ok: true, supabase, userId: "admin-1" };
}

function query(result: { data?: unknown; error?: unknown } = {}) {
  const builder = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.single.mockResolvedValue(result);
  builder.maybeSingle.mockResolvedValue(result);
  return builder;
}

describe("finance Server Actions", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.revalidatePath.mockReset();
  });

  it("returns authorization rejection before any database mutation", async () => {
    const denied = { ok: false, message: "Você não tem permissão para registrar pagamentos." };
    mocks.requireAdmin.mockResolvedValue(denied);

    await expect(markPaid("tenant-1")).resolves.toEqual(denied);
    expect(mocks.requireAdmin).toHaveBeenCalledWith("registrar pagamentos");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("inserts the current charge from server-owned tenant data", async () => {
    const tenant = query({ data: { monthly_fee: "1234.56" }, error: null });
    const existing = query({ data: null, error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(tenant)
        .mockReturnValueOnce(existing)
        .mockReturnValueOnce({ insert }),
    };
    mocks.requireAdmin.mockResolvedValue(admin(supabase));

    await expect(markPaid("tenant-1")).resolves.toEqual({ ok: true });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "tenant-1",
        amount: 1234.56,
        status: "paid",
      }),
    );
    const payload = insert.mock.calls[0]?.[0] as { reference_month: string; paid_at: string };
    expect(payload.reference_month).toMatch(/^\d{4}-\d{2}-01$/);
    expect(Number.isNaN(Date.parse(payload.paid_at))).toBe(false);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("translates payment lookup errors without attempting an update", async () => {
    const lookup = query({ data: null, error: { message: "RLS denied" } });
    const supabase = { from: vi.fn().mockReturnValue(lookup) };
    mocks.requireAdmin.mockResolvedValue(admin(supabase));

    await expect(undoPaid("tenant-1")).resolves.toEqual({
      ok: false,
      message: "Não foi possível ler os pagamentos: RLS denied",
    });
    expect(lookup.update).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not report a reversal when RLS makes the update affect zero rows", async () => {
    const lookup = query({ data: { id: "payment-1" }, error: null });
    const update = query({ data: null, error: null });
    const supabase = {
      from: vi.fn().mockReturnValueOnce(lookup).mockReturnValueOnce(update),
    };
    mocks.requireAdmin.mockResolvedValue(admin(supabase));

    await expect(undoPaid("tenant-1")).resolves.toEqual({
      ok: false,
      message: "Pagamento não encontrado ou sem permissão para reverter.",
    });
    expect(update.update).toHaveBeenCalledWith({ status: "pending", paid_at: null });
    expect(update.select).toHaveBeenCalledWith("id");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates only after the payment row is returned", async () => {
    const lookup = query({ data: { id: "payment-1" }, error: null });
    const update = query({ data: { id: "payment-1" }, error: null });
    const supabase = {
      from: vi.fn().mockReturnValueOnce(lookup).mockReturnValueOnce(update),
    };
    mocks.requireAdmin.mockResolvedValue(admin(supabase));

    await expect(undoPaid("tenant-1")).resolves.toEqual({ ok: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
