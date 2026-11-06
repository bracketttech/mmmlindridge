import { describe, expect, it } from "vitest";
import { ageing, cardOutcome, depositSummary, escalatedRent, invoiceStatus, invoiceTotals, luhn, nextInvoiceDates, paymentStatusFor, statement, tenantBalance, validateProof } from "./billing-rules";
import { seedBilling } from "@/mocks/billing-store";
import type { Invoice, Payment } from "@/mocks/billing";

const line = (kind: "rent" | "utilities" | "deposit" | "parking", qty: number, unitPrice: number) => ({ kind, qty, unitPrice });

describe("invoice totals & VAT", () => {
  it("adds multiple lines without VAT", () => {
    expect(invoiceTotals([line("rent", 1, 12500), line("utilities", 1, 640.5), line("parking", 2, 450)], false)).toEqual({ subtotal: 14040.5, vat: 0, total: 14040.5 });
  });
  it("rounds VAT half-up to the cent", () => {
    expect(invoiceTotals([line("rent", 1, 11200), line("utilities", 1, 640.5), line("parking", 2, 450)], true)).toEqual({ subtotal: 12740.5, vat: 1911.08, total: 14651.58 });
  });
  it("adds 15% VAT on every line except deposits", () => {
    expect(invoiceTotals([line("rent", 1, 10000), line("deposit", 1, 10000)], true)).toEqual({ subtotal: 20000, vat: 1500, total: 21500 });
  });
});

describe("recurring schedule preview", () => {
  it("shows the next 3 dates on the chosen day", () => {
    expect(nextInvoiceDates("2026-01-01", 1, "2026-11-06")).toEqual(["2026-12-01", "2027-01-01", "2027-02-01"]);
  });
  it("uses the last day of shorter months for day 31", () => {
    expect(nextInvoiceDates("2027-01-01", 31, "2026-11-06")).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
  });
  it("stops at the end date", () => {
    expect(nextInvoiceDates("2026-01-01", 1, "2026-11-06", 3, "2027-01-15")).toEqual(["2026-12-01", "2027-01-01"]);
  });
});

const inv = (over: Partial<Invoice> = {}): Invoice => ({ id: "i1", number: "INV-1", tenantId: "t", propertyId: "p", unitId: "u", issueDate: "2026-10-25", dueDate: "2026-11-01", lines: [{ id: "l", kind: "rent", description: "Rent", qty: 1, unitPrice: 1000 }], vat: false, sentAt: "2026-10-25", ...over });
const pay = (amount: number, status: Payment["status"] = "cleared", over: Partial<Payment> = {}): Payment => ({ id: `p${amount}${status}`, ref: "R", tenantId: "t", invoiceId: "i1", amount, method: "eft", date: "2026-11-01", status, source: "manual", ...over });

describe("invoice status & balance", () => {
  it("ignores pending and failed payments", () => {
    expect(invoiceStatus(inv(), [pay(1000, "pending"), pay(1000, "failed")], "2026-11-06")).toBe("overdue");
    expect(tenantBalance("t", [inv()], [pay(1000, "pending")])).toBe(1000);
  });
  it("is partial before the due date and paid when covered", () => {
    expect(invoiceStatus(inv({ dueDate: "2026-12-01" }), [pay(400)], "2026-11-06")).toBe("partial");
    expect(invoiceStatus(inv(), [pay(1000)], "2026-11-06")).toBe("paid");
    expect(invoiceStatus(inv({ sentAt: undefined }), [], "2026-11-06")).toBe("draft");
  });
});

describe("arrears ageing", () => {
  it("buckets by days past due and counts tenants", () => {
    const a = ageing([inv({ id: "a", dueDate: "2026-10-20" }), inv({ id: "b", dueDate: "2026-09-01" }), inv({ id: "c", tenantId: "x", dueDate: "2026-07-01" }), inv({ id: "d", dueDate: "2026-12-01" })], [], "2026-11-06");
    expect(a.buckets.map((b) => [b.bucket, b.tenants, b.amount])).toEqual([["b0", 1, 1000], ["b30", 0, 0], ["b60", 1, 1000], ["b90", 1, 1000]]);
    expect(a.total).toBe(3000);
  });
});

describe("statements reconcile with mock data", () => {
  const s = seedBilling();
  for (const id of ["t1", "t2", "t4", "t5", "t6"]) {
    it(`closing balance equals invoices minus payments for ${id}`, () => {
      const st = statement(id, s.invoices, s.payments, "2000-01-01", "2099-12-31");
      expect(st.opening).toBe(0);
      expect(st.closing).toBe(tenantBalance(id, s.invoices, s.payments));
      expect(st.lines.at(-1)?.balance ?? 0).toBe(st.closing);
    });
  }
  it("opening + period movements = closing for a partial range", () => {
    const st = statement("t2", s.invoices, s.payments, "2026-10-01", "2026-11-30");
    expect(st.closing).toBe(Math.round((st.opening + st.invoiced - st.paid) * 100) / 100);
    expect(st.closing).toBe(tenantBalance("t2", s.invoices, s.payments));
  });
  it("seeds Pieter's arrears: Sep short 5 585 + Oct 9 540 + Nov 9 510", () => {
    expect(tenantBalance("t2", s.invoices, s.payments)).toBe(24635);
  });
});

describe("deposits & escalation", () => {
  it("computes simple interest, deductions and refund", () => {
    expect(depositSummary({ amount: 10000, heldSince: "2025-11-06", ratePct: 5, deductions: [{ id: "1", item: "Paint", amount: 1200 }] }, "2026-11-06")).toEqual({ interest: 500, deductions: 1200, refund: 9300 });
  });
  it("rounds escalated rent to the rand", () => {
    expect(escalatedRent(12500, 8)).toBe(13500);
    expect(escalatedRent(11200, 7.5)).toBe(12040);
  });
});

describe("gateway checkout outcomes", () => {
  it("maps demo cards to outcomes", () => {
    expect(cardOutcome("4242 4242 4242 4242")).toBe("success");
    expect(cardOutcome("4000 0000 0000 0002")).toBe("failed");
    expect(cardOutcome("4000 0000 0000 3220")).toBe("pending");
    expect(cardOutcome("1234 5678 9012 3456")).toBe("invalid");
    expect(luhn("4000000000003220")).toBe(true);
  });
  it("records nothing for abandoned checkouts", () => {
    expect(paymentStatusFor("abandoned")).toBeNull();
    expect(paymentStatusFor("success")).toBe("cleared");
    expect(paymentStatusFor("pending")).toBe("pending");
    expect(paymentStatusFor("failed")).toBe("failed");
  });
  it("validates proof of payment files", () => {
    expect(validateProof({ type: "application/x-msdownload", size: 10 })).toBe("type");
    expect(validateProof({ type: "application/pdf", size: 11 * 1024 * 1024 })).toBe("size");
    expect(validateProof({ type: "image/png", size: 1000 })).toBeNull();
  });
});
