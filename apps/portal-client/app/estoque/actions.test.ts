import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCustomer: vi.fn(),
  logActivity: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/sessao", () => ({ requireCustomer: mocks.requireCustomer }));
vi.mock("@/lib/historico", () => ({ logActivity: mocks.logActivity }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { recordStockMovement, undoStockMovement } from "./actions";

function customer(supabase: unknown) {
  return {
    ok: true,
    supabase,
    tenantId: "tenant-1",
    userId: "user-1",
    name: "Estoquista",
    roleId: "role-1",
    isOwner: false,
    modules: ["stock"],
  };
}

/** `from(...).select().eq().single()` resolvendo para a linha dada. */
function supabaseWith(row: unknown, rpcResult: { error: unknown } = { error: null }) {
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const query = { select: vi.fn(), eq: vi.fn(), single, update: vi.fn(), insert: vi.fn() };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return {
    from: vi.fn().mockReturnValue(query),
    rpc: vi.fn().mockResolvedValue({ data: null, ...rpcResult }),
    query,
  };
}

const product = { id: "p1", name: "Ração 1kg", stock_quantity: 10, tracks_stock: true };

describe("stock Server Actions", () => {
  beforeEach(() => {
    mocks.requireCustomer.mockReset();
    mocks.logActivity.mockReset().mockResolvedValue(undefined);
    mocks.revalidatePath.mockReset();
  });

  it("sends a purchase to the atomic RPC and never writes costs or products directly", async () => {
    const supabase = supabaseWith(product);
    mocks.requireCustomer.mockResolvedValue(customer(supabase));

    await expect(
      recordStockMovement({ productId: "p1", type: "in", quantidade: 5, custoUnitario: 3.33, reason: " NF 1 " }),
    ).resolves.toEqual({ ok: true });

    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "record_stock_purchase",
      expect.objectContaining({ p_product_id: "p1", p_quantity: 5, p_unit_cost: 3.33, p_reason: "NF 1" }),
    );
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith("products");
    expect(supabase.query.update).not.toHaveBeenCalled();
    expect(supabase.query.insert).not.toHaveBeenCalled();
    expect(mocks.logActivity).toHaveBeenCalledWith(
      supabase,
      "stock.moved",
      expect.objectContaining({ summary: "Ração 1kg: +5 · saldo 15" }),
    );
  });

  it("reports a failed purchase instead of claiming success", async () => {
    const supabase = supabaseWith(product, { error: { code: "23514", message: "check violation" } });
    mocks.requireCustomer.mockResolvedValue(customer(supabase));

    await expect(
      recordStockMovement({ productId: "p1", type: "in", quantidade: 5, custoUnitario: 2, reason: "" }),
    ).resolves.toEqual({ ok: false, message: "check violation" });
    expect(mocks.logActivity).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("signs out/adjustment deltas and keeps them on apply_stock_movement", async () => {
    const supabase = supabaseWith(product);
    mocks.requireCustomer.mockResolvedValue(customer(supabase));

    await recordStockMovement({ productId: "p1", type: "out", quantidade: 3, custoUnitario: 0, reason: "" });
    expect(supabase.rpc).toHaveBeenLastCalledWith(
      "apply_stock_movement",
      expect.objectContaining({ p_type: "out", p_quantity: -3, p_unit_cost: null }),
    );

    // Ajuste fala em saldo final: contou 4 com 10 no sistema → −6.
    await recordStockMovement({ productId: "p1", type: "adjustment", quantidade: 4, custoUnitario: 0, reason: "" });
    expect(supabase.rpc).toHaveBeenLastCalledWith(
      "apply_stock_movement",
      expect.objectContaining({ p_type: "adjustment", p_quantity: -6 }),
    );
  });

  it("treats an entry without cost as a plain movement, not a purchase", async () => {
    const supabase = supabaseWith(product);
    mocks.requireCustomer.mockResolvedValue(customer(supabase));

    await recordStockMovement({ productId: "p1", type: "in", quantidade: 2, custoUnitario: 0, reason: "" });
    expect(supabase.rpc).toHaveBeenCalledWith(
      "apply_stock_movement",
      expect.objectContaining({ p_type: "in", p_quantity: 2 }),
    );
  });

  it("does nothing when the count already matches the balance", async () => {
    const supabase = supabaseWith(product);
    mocks.requireCustomer.mockResolvedValue(customer(supabase));

    await expect(
      recordStockMovement({ productId: "p1", type: "adjustment", quantidade: 10, custoUnitario: 0, reason: "" }),
    ).resolves.toEqual({ ok: true });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(mocks.logActivity).not.toHaveBeenCalled();
  });

  it("refuses products that do not track stock", async () => {
    const supabase = supabaseWith({ ...product, tracks_stock: false });
    mocks.requireCustomer.mockResolvedValue(customer(supabase));

    await expect(
      recordStockMovement({ productId: "p1", type: "in", quantidade: 1, custoUnitario: 1, reason: "" }),
    ).resolves.toEqual({ ok: false, message: "Este produto não controla estoque." });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("will not undo a sale deduction through the manual reversal", async () => {
    const supabase = supabaseWith({ id: "m1", product_id: "p1", quantity: -2, type: "sale", sale_id: "s1" });
    mocks.requireCustomer.mockResolvedValue(customer(supabase));

    await expect(undoStockMovement("m1")).resolves.toEqual({
      ok: false,
      message: "Baixa por venda se desfaz estornando a venda.",
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("reverses a manual movement with the opposite adjustment", async () => {
    const supabase = supabaseWith({ id: "m1", product_id: "p1", quantity: 5, type: "in", sale_id: null });
    mocks.requireCustomer.mockResolvedValue(customer(supabase));

    await expect(undoStockMovement("m1")).resolves.toEqual({ ok: true });
    expect(supabase.rpc).toHaveBeenCalledWith(
      "apply_stock_movement",
      expect.objectContaining({ p_product_id: "p1", p_type: "adjustment", p_quantity: -5 }),
    );
  });
});
