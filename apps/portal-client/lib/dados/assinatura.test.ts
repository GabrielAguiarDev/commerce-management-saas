import { describe, expect, it } from "vitest";
import { dateBr, monthLabel, rejectionMessage, toAttempt, toCharge, todayBr } from "./assinatura";

const row = {
  id: "c1",
  reference_month: "2026-10-01",
  amount: "89.90",
  status: "pending",
  due_date: "2026-10-10",
  paid_at: null,
  payment_method: null,
};

describe("billing charge mapping", () => {
  it("keeps a charge pending on its due date and overdue only the day after", () => {
    expect(toCharge(row, "2026-10-10").status).toBe("pending");
    expect(toCharge(row, "2026-10-11").status).toBe("overdue");
  });

  it("never reports a paid charge as overdue and carries how it was paid", () => {
    const paid = toCharge(
      { ...row, status: "paid", paid_at: "2026-10-12T15:00:00Z", payment_method: "pix" },
      "2026-11-30",
    );
    expect(paid).toMatchObject({ status: "paid", method: "pix", amount: 89.9 });
  });

  it("treats a manual console payment as paid without a method", () => {
    const paid = toCharge({ ...row, status: "paid", paid_at: "2026-10-12T15:00:00Z" }, "2026-10-12");
    expect(paid.method).toBeNull();
  });

  it("uses the Brazilian calendar day, not UTC", () => {
    // 01:30 UTC do dia 11 ainda é dia 10 em São Paulo.
    expect(todayBr(new Date("2026-10-11T01:30:00Z"))).toBe("2026-10-10");
  });
});

describe("billing attempt mapping", () => {
  it("rejects a malformed function response instead of guessing", () => {
    expect(toAttempt(null)).toBeNull();
    expect(toAttempt({ id: "a1", payment_id: "c1", method: "boleto", status: "pending" })).toBeNull();
    expect(toAttempt({ id: "a1", payment_id: "c1", method: "pix", status: "paid" })).toBeNull();
  });

  it("maps the Pix fields the screen draws", () => {
    expect(
      toAttempt({
        id: "a1",
        payment_id: "c1",
        method: "pix",
        status: "pending",
        amount: "89.90",
        pix_code: "000201",
        pix_qr_base64: "iVBOR",
        expires_at: "2026-10-03T19:30:00Z",
      }),
    ).toMatchObject({ chargeId: "c1", amount: 89.9, pixCode: "000201", pixQr: "iVBOR" });
  });
});

describe("billing labels", () => {
  it("formats months and dates in Portuguese", () => {
    expect(monthLabel("2026-10-01")).toBe("outubro de 2026");
    expect(dateBr("2026-10-10")).toBe("10/10/2026");
    expect(dateBr("2026-10-11T01:30:00Z")).toBe("10/10/2026");
    expect(dateBr(null)).toBe("—");
  });

  it("falls back to a generic message for an unknown rejection reason", () => {
    expect(rejectionMessage("cc_rejected_insufficient_amount")).toContain("limite");
    expect(rejectionMessage("something_new")).toContain("não aprovou");
  });
});
