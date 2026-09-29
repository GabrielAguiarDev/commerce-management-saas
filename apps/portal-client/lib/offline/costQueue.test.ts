import { describe, expect, it } from "vitest";
import {
  applyCostAttempt,
  classifyCostAttempt,
  COST_NETWORK_CODE,
  costsDueForSync,
  costsInScope,
  createQueuedCost,
  describeCostQueueError,
  resetCostForRetry,
} from "./costQueue";

const scope = { tenantId: "tenant-a", userId: "user-a" };
const now = new Date("2026-09-28T15:00:00.000Z");

function queued() {
  return createQueuedCost({
    clientId: "f3000000-0000-4000-8000-000000000001",
    scope,
    type: "fixed",
    description: "  Energia  ",
    category: "  Contas  ",
    amount: 175.5,
    costDate: "2026-09-28",
    now,
  });
}

describe("offline cost queue rules", () => {
  it("captures a normalized immutable submission and its account scope", () => {
    expect(queued()).toMatchObject({
      tenantId: "tenant-a",
      userId: "user-a",
      description: "Energia",
      category: "Contas",
      status: "pending",
      attempts: 0,
      createdAt: now.toISOString(),
    });
  });

  it("retries transport/session failures but stops validation and authorization failures", () => {
    expect(classifyCostAttempt({ code: COST_NETWORK_CODE, message: "offline" })).toBe("retry");
    expect(classifyCostAttempt({ code: "session", message: "expired" })).toBe("retry");
    expect(classifyCostAttempt({ code: "40001", message: "serialization" })).toBe("retry");
    expect(classifyCostAttempt({ code: "42501", message: "denied" })).toBe("failed");
    expect(classifyCostAttempt({ code: "22023", message: "invalid" })).toBe("failed");
  });

  it("never mistakes 23505 for success because exact retries succeed inside the RPC", () => {
    const error = { code: "23505", message: "UUID collision" };
    expect(classifyCostAttempt(error)).toBe("failed");
    const next = applyCostAttempt(queued(), error, new Date("2026-09-28T15:01:00Z"));
    expect(next).toMatchObject({ status: "failed", attempts: 1, lastError: error });
    expect(describeCostQueueError(error, "failed")).toContain("conflitou");
  });

  it("removes only server-confirmed costs and keeps transient attempts pending", () => {
    expect(applyCostAttempt(queued(), null, now)).toBeNull();
    expect(
      applyCostAttempt(
        queued(),
        { code: COST_NETWORK_CODE, message: "offline" },
        new Date("2026-09-28T15:01:00Z"),
      ),
    ).toMatchObject({ status: "pending", attempts: 1 });
  });

  it("never sends another tenant/user queue and honors automatic backoff", () => {
    const first = applyCostAttempt(
      queued(),
      { code: COST_NETWORK_CODE, message: "offline" },
      now,
    )!;
    const other = { ...queued(), clientId: "other", tenantId: "tenant-b" };
    expect(costsInScope([other, first], scope)).toEqual([first]);
    expect(costsDueForSync([other, first], scope, new Date(now.getTime() + 4_999), false)).toEqual([]);
    expect(costsDueForSync([other, first], scope, new Date(now.getTime() + 5_000), false)).toEqual([first]);
    expect(costsDueForSync([other, first], scope, now, true)).toEqual([first]);
  });

  it("manual retry makes a permanent rejection pending and immediately due", () => {
    const failed = applyCostAttempt(queued(), { code: "42501", message: "denied" }, now)!;
    const retried = resetCostForRetry(failed, new Date("2026-09-28T16:00:00Z"));
    expect(retried).toMatchObject({ status: "pending", attempts: 0 });
    expect(costsDueForSync([retried], scope, new Date("2026-09-28T16:00:00Z"), false)).toEqual([
      retried,
    ]);
  });
});
