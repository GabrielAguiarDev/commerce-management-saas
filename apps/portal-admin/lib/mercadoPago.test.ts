import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/autorizacao", () => ({ requireAdmin: mocks.requireAdmin }));
import { loadMercadoPago } from "./mercadoPago";

describe("Mercado Pago release", () => {
  afterEach(() => vi.unstubAllEnvs());
  it.each([undefined, "false", "TRUE"])("does not call account integration when release is %s", async (release) => {
    vi.stubEnv("NEXT_PUBLIC_PLATFORM_PAYMENTS_ENABLED", release);
    await expect(loadMercadoPago(30)).resolves.toEqual({ state: "unconfigured" });
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
  });
});
