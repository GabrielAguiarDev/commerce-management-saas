import { describe, expect, it } from "vitest";
import { formatDateTime, formatMoney, parsePeriod, statusGroup } from "./recebimentos";

describe("payouts helpers", () => {
  it("only accepts the periods the panel offers", () => {
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod(["90", "7"])).toBe(90);
    expect(parsePeriod("365")).toBe(30);
    expect(parsePeriod(undefined)).toBe(30);
  });

  it("keeps the cents a fee needs", () => {
    expect(formatMoney(0.89)).toBe("R$ 0,89");
    expect(formatMoney(1284.5)).toBe("R$ 1.284,50");
  });

  it("folds Mercado Pago statuses into the four filter groups", () => {
    expect(statusGroup("approved")).toBe("approved");
    expect(statusGroup("in_process")).toBe("pending");
    expect(statusGroup("cancelled")).toBe("rejected");
    expect(statusGroup("charged_back")).toBe("refunded");
  });

  it("shows payment times in the Brazilian timezone", () => {
    expect(formatDateTime("2026-10-04T01:30:00Z")).toBe("03/10 22:30");
    expect(formatDateTime(null)).toBe("—");
  });
});
