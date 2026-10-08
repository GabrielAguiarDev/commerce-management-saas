import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readBilling } from "./leitura";

describe("billing release", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([undefined, "false", "TRUE"])("does not generate or read charges when release is %s", async (release) => {
    vi.stubEnv("NEXT_PUBLIC_PLATFORM_PAYMENTS_ENABLED", release);
    const client = { rpc: vi.fn(), from: vi.fn() };
    await expect(readBilling(client as unknown as Parameters<typeof readBilling>[0], "tenant-1", true)).resolves.toBeNull();
    expect(client.rpc).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
  });

  it("only generates charges after explicit release", async () => {
    vi.stubEnv("NEXT_PUBLIC_PLATFORM_PAYMENTS_ENABLED", "true");
    const client = { rpc: vi.fn().mockResolvedValue({ error: { message: "unavailable" } }) };
    await expect(readBilling(client as unknown as Parameters<typeof readBilling>[0], "tenant-1", true)).resolves.toBeNull();
    expect(client.rpc).toHaveBeenCalledOnce();
    expect(client.rpc).toHaveBeenCalledWith("ensure_current_charge");
  });
});
