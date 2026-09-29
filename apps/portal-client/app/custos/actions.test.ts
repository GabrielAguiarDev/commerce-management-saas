import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCustomer: vi.fn(),
  logActivity: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/sessao", () => ({ requireCustomer: mocks.requireCustomer }));
vi.mock("@/lib/historico", () => ({ logActivity: mocks.logActivity }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createOfflineCost } from "./actions";

const input = {
  clientId: "f3000000-0000-4000-8000-000000000001",
  type: "fixed" as const,
  description: "  Energia  ",
  category: "  Contas  ",
  amount: 175.5,
  data: "2026-09-28",
};

function customer(supabase: unknown) {
  return {
    ok: true,
    supabase,
    tenantId: "tenant-1",
    userId: "user-1",
    name: "Dono",
    roleId: "role-1",
    isOwner: true,
    modules: ["costs"],
  };
}

describe("offline manual cost Server Action", () => {
  beforeEach(() => {
    mocks.requireCustomer.mockReset();
    mocks.logActivity.mockReset().mockResolvedValue(undefined);
    mocks.revalidatePath.mockReset();
  });

  it("classifies an expired session so the durable queue can retry after login", async () => {
    mocks.requireCustomer.mockResolvedValue({
      ok: false,
      message: "Sessão expirada. Entre novamente para continuar.",
    });

    await expect(createOfflineCost(input)).resolves.toEqual({
      ok: false,
      code: "session",
      message: "Sessão expirada. Entre novamente para continuar.",
    });
    expect(mocks.requireCustomer).toHaveBeenCalledWith("lançar um custo", "costs");
  });

  it("maps the browser UUID and normalized payload to the idempotent RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { id: input.clientId, created: true },
      error: null,
    });
    const supabase = { rpc };
    mocks.requireCustomer.mockResolvedValue(customer(supabase));

    await expect(createOfflineCost(input)).resolves.toEqual({ ok: true, created: true });
    expect(rpc).toHaveBeenCalledWith("create_manual_cost_idempotent", {
      p_id: input.clientId,
      p_description: "Energia",
      p_type: "fixed",
      p_category: "Contas",
      p_amount: 175.5,
      p_cost_date: "2026-09-28",
    });
    expect(mocks.logActivity).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("does not duplicate activity on an exact retry already accepted by the RPC", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: { id: input.clientId, created: false },
        error: null,
      }),
    };
    mocks.requireCustomer.mockResolvedValue(customer(supabase));

    await expect(createOfflineCost(input)).resolves.toEqual({ ok: true, created: false });
    expect(mocks.logActivity).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(1);
  });

  it("preserves a permanent UUID collision code for actionable rejection", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505", message: "identificador já usado por outro custo" },
      }),
    };
    mocks.requireCustomer.mockResolvedValue(customer(supabase));

    await expect(createOfflineCost(input)).resolves.toEqual({
      ok: false,
      code: "23505",
      message: "identificador já usado por outro custo",
    });
    expect(mocks.logActivity).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
