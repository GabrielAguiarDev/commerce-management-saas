import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCustomer: vi.fn(),
  logActivity: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/sessao", () => ({ requireCustomer: mocks.requireCustomer }));
vi.mock("@/lib/historico", () => ({ logActivity: mocks.logActivity }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { closeRegister, openRegister, reopenRegister } from "./actions";

function customer(supabase: unknown) {
  return {
    ok: true,
    supabase,
    tenantId: "tenant-1",
    userId: "user-1",
    name: "Caixa",
    roleId: "role-1",
    isOwner: false,
    modules: ["register"],
  };
}

function chain<T extends object>(terminal: T) {
  const query = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    ...terminal,
  };
  query.select.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

describe("cash-register Server Actions", () => {
  beforeEach(() => {
    mocks.requireCustomer.mockReset();
    mocks.logActivity.mockReset().mockResolvedValue(undefined);
    mocks.revalidatePath.mockReset();
  });

  it("returns the session rejection without touching Supabase", async () => {
    const denied = { ok: false, message: "Você não tem permissão para abrir o caixa." };
    mocks.requireCustomer.mockResolvedValue(denied);

    await expect(openRegister(10)).resolves.toEqual(denied);
    expect(mocks.requireCustomer).toHaveBeenCalledWith("abrir o caixa", "register");
    expect(mocks.logActivity).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("translates the partial-unique-index conflict into a stable message", async () => {
    const insert = vi.fn().mockResolvedValue({
      error: {
        code: "23505",
        message: "duplicate key value",
        details: "cash_registers_one_open_per_tenant",
      },
    });
    const supabase = { from: vi.fn().mockReturnValue({ insert }) };
    mocks.requireCustomer.mockResolvedValue(customer(supabase));

    await expect(openRegister(25)).resolves.toEqual({
      ok: false,
      message: "Já existe um caixa aberto.",
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "tenant-1",
        opened_by: "user-1",
        opening_amount: 25,
        status: "open",
      }),
    );
  });

  it("maps closing data to the transactional RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const supabase = { rpc };
    mocks.requireCustomer.mockResolvedValue(customer(supabase));

    await expect(closeRegister("register-1", 87.5, "  diferença conferida  ")).resolves.toEqual({
      ok: true,
    });
    expect(rpc).toHaveBeenCalledWith("close_cash_register", {
      p_register_id: "register-1",
      p_counted_cash: 87.5,
      p_note: "diferença conferida",
    });
    expect(mocks.logActivity).toHaveBeenCalledWith(
      supabase,
      "register.closed",
      expect.objectContaining({ entityId: "register-1" }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("does not report success when the reopen update affects zero rows", async () => {
    const openLookup = chain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    const update = chain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    const supabase = {
      from: vi.fn().mockReturnValueOnce(openLookup).mockReturnValueOnce(update),
    };
    mocks.requireCustomer.mockResolvedValue(customer(supabase));

    await expect(reopenRegister("hidden-or-stale")).resolves.toEqual({
      ok: false,
      message: "Caixa fechado não encontrado.",
    });
    expect(update.select).toHaveBeenCalledWith("id");
    expect(mocks.logActivity).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("logs and revalidates only after a row is actually reopened", async () => {
    const openLookup = chain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    const update = chain({
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "register-1" }, error: null }),
    });
    const supabase = {
      from: vi.fn().mockReturnValueOnce(openLookup).mockReturnValueOnce(update),
    };
    mocks.requireCustomer.mockResolvedValue(customer(supabase));

    await expect(reopenRegister("register-1")).resolves.toEqual({ ok: true });
    expect(mocks.logActivity).toHaveBeenCalledWith(supabase, "register.reopened", {
      entityId: "register-1",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
