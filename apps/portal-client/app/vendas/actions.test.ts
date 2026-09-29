import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCustomer: vi.fn(),
  logActivity: vi.fn(),
  revalidatePath: vi.fn(),
  after: vi.fn(),
}));

vi.mock("@/lib/sessao", () => ({ requireCustomer: mocks.requireCustomer }));
vi.mock("@/lib/historico", () => ({ logActivity: mocks.logActivity }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/server", () => ({ after: mocks.after }));
// Nota fiscal fora do escopo destes testes: o módulo segue "em breve".
vi.mock("@/lib/modulos", () => ({ isComingSoon: () => true }));

import { editSale, recordSale, refundSale } from "./actions";

const CLIENT_ID = "f5000000-0000-4000-8000-000000000001";
const items = [
  { productId: "p1", name: "Café", qtd: 2, price: 5.5 },
  { productId: null, name: "Avulso", qtd: 1, price: 3 },
];

function customer(supabase: unknown) {
  return {
    ok: true,
    supabase,
    tenantId: "tenant-1",
    userId: "user-1",
    name: "Vendedor",
    roleId: "role-1",
    isOwner: false,
    modules: ["sales"],
  };
}

function withRpc(result: { data?: unknown; error?: unknown }) {
  const supabase = { rpc: vi.fn().mockResolvedValue({ data: null, error: null, ...result }) };
  mocks.requireCustomer.mockResolvedValue(customer(supabase));
  return supabase;
}

describe("sales Server Actions", () => {
  beforeEach(() => {
    mocks.requireCustomer.mockReset();
    mocks.logActivity.mockReset().mockResolvedValue(undefined);
    mocks.revalidatePath.mockReset();
    mocks.after.mockReset();
  });

  it("separates an expired session (queue waits) from a denied one (queue stops)", async () => {
    mocks.requireCustomer.mockResolvedValueOnce({ ok: false, message: "Sessão expirada. Entre novamente." });
    await expect(recordSale(items, "cash")).resolves.toMatchObject({ ok: false, code: "session" });

    mocks.requireCustomer.mockResolvedValueOnce({ ok: false, message: "Você não tem permissão." });
    await expect(recordSale(items, "cash")).resolves.toMatchObject({ ok: false, code: "42501" });
  });

  it("rejects an empty cart and a malformed client id before calling the database", async () => {
    const supabase = withRpc({ data: "sale-1" });
    await expect(recordSale([], "cash")).resolves.toMatchObject({ ok: false, code: "22023" });
    await expect(recordSale(items, "cash", "", "nao-e-uuid")).resolves.toMatchObject({
      ok: false,
      code: "22023",
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("lets the database compute the total and passes the offline id and click time", async () => {
    const supabase = withRpc({ data: "sale-1" });
    const soldAt = new Date(Date.now() - 3_600_000).toISOString();

    await expect(recordSale(items, "pix", "123.456.789-09", CLIENT_ID, soldAt)).resolves.toEqual({ ok: true });

    const [fn, args] = supabase.rpc.mock.calls[0];
    expect(fn).toBe("create_sale");
    expect(args).toEqual({
      p_payment_method: "pix",
      p_items: [
        { product_id: "p1", product_name: "Café", quantity: 2, unit_price: 5.5 },
        { product_id: "", product_name: "Avulso", quantity: 1, unit_price: 3 },
      ],
      p_customer_document: "12345678909",
      p_customer_name: null,
      p_sold_at: soldAt,
      p_id: CLIENT_ID,
    });
    expect(args).not.toHaveProperty("p_total");
    expect(mocks.logActivity).toHaveBeenCalledWith(
      supabase,
      "sale.created",
      expect.objectContaining({ entityId: "sale-1", summary: expect.stringContaining("14,00") }),
    );
  });

  it("drops a future click time so the database stamps now()", async () => {
    const supabase = withRpc({ data: "sale-1" });
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();

    await recordSale(items, "cash", "", CLIENT_ID, tomorrow);
    expect(supabase.rpc.mock.calls[0][1]).toMatchObject({ p_sold_at: null });

    await recordSale(items, "cash", "", CLIENT_ID, "lixo");
    expect(supabase.rpc.mock.calls[1][1]).toMatchObject({ p_sold_at: null });
  });

  it("treats 23505 on a queued retry as already recorded, without repeating history", async () => {
    withRpc({ error: { code: "23505", message: "duplicate key" } });

    await expect(recordSale(items, "cash", "", CLIENT_ID)).resolves.toEqual({ ok: true, duplicate: true });
    expect(mocks.logActivity).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("does not hide 23505 when the sale has no client id", async () => {
    withRpc({ error: { code: "23505", message: "duplicate key" } });

    await expect(recordSale(items, "cash")).resolves.toEqual({
      ok: false,
      message: "duplicate key",
      code: "23505",
    });
  });

  it("logs a refund only when the database actually changed the sale", async () => {
    const supabase = withRpc({ data: false });
    await expect(refundSale("sale-1")).resolves.toEqual({ ok: true });
    expect(supabase.rpc).toHaveBeenCalledWith("set_sale_refunded", { p_sale_id: "sale-1", p_refunded: true });
    expect(mocks.logActivity).not.toHaveBeenCalled();

    withRpc({ data: true });
    await refundSale("sale-1");
    expect(mocks.logActivity).toHaveBeenCalledWith(expect.anything(), "sale.refunded", { entityId: "sale-1" });
  });

  it("edits by replacement and repeats no side effect on an idempotent retry", async () => {
    withRpc({ data: { sale_id: "sale-2", changed: true } });
    await expect(editSale("sale-1", items, "debit")).resolves.toEqual({ ok: true });
    expect(mocks.logActivity).toHaveBeenCalledTimes(2);

    mocks.logActivity.mockClear();
    withRpc({ data: { sale_id: "sale-2", changed: false } });
    await expect(editSale("sale-1", items, "debit")).resolves.toEqual({ ok: true });
    expect(mocks.logActivity).not.toHaveBeenCalled();
  });

  it("fails an edit whose replacement id did not come back", async () => {
    withRpc({ data: null });
    await expect(editSale("sale-1", items, "cash")).resolves.toEqual({
      ok: false,
      message: "Não foi possível identificar a venda substituta.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
