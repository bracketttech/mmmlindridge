// Pure billing rules (Phase 7). Covered by billing-rules.test.ts.
import { VAT_RATE, type Deposit, type Invoice, type InvoiceLine, type InvoiceStatus, type Payment, type PayStatus } from "@/mocks/billing";

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const lineTotal = (l: Pick<InvoiceLine, "qty" | "unitPrice">) => round2(l.qty * l.unitPrice);

/** Subtotal, VAT (15%, never on deposits) and total for a set of lines. */
export function invoiceTotals(lines: Pick<InvoiceLine, "kind" | "qty" | "unitPrice">[], vat: boolean) {
  const subtotal = round2(lines.reduce((a, l) => a + lineTotal(l), 0));
  const vatable = lines.filter((l) => l.kind !== "deposit").reduce((a, l) => a + lineTotal(l), 0);
  // VAT in whole cents, half-up (avoids float drift like 1911.075 → 1911.07).
  const vatAmount = vat ? Math.round(Math.round(vatable * 100) * VAT_RATE * 100 / 100 + 1e-6) / 100 : 0;
  return { subtotal, vat: vatAmount, total: round2(subtotal + vatAmount) };
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number) as [number, number, number]; return new Date(y, m - 1, d); };
export const daysBetween = (from: string, to: string) => Math.round((parse(to).getTime() - parse(from).getTime()) / 864e5);
export const addMonths = (s: string, n: number) => { const d = parse(s); const day = d.getDate(); const t = new Date(d.getFullYear(), d.getMonth() + n, 1); t.setDate(Math.min(day, new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate())); return iso(t); };

/** Next `n` invoice dates for a monthly schedule. Day 29–31 falls back to the last day of shorter months. */
export function nextInvoiceDates(startDate: string, dayOfMonth: number, from: string, n = 3, endDate?: string) {
  const floor = startDate > from ? startDate : from;
  const f = parse(floor);
  const out: string[] = [];
  for (let i = 0; out.length < n && i < n + 24; i++) {
    const y = f.getFullYear(); const m = f.getMonth() + i;
    const last = new Date(y, m + 1, 0).getDate();
    const d = iso(new Date(y, m, Math.min(dayOfMonth, last)));
    if (d < floor) continue;
    if (endDate && d > endDate) break;
    out.push(d);
  }
  return out;
}

/** Only cleared payments reduce what is owed. */
export const counts = (s: PayStatus) => s === "cleared";
export const paidOn = (inv: Pick<Invoice, "id">, payments: Payment[]) => round2(payments.filter((p) => p.invoiceId === inv.id && counts(p.status)).reduce((a, p) => a + p.amount, 0));
export const invoiceTotal = (inv: Pick<Invoice, "lines" | "vat">) => invoiceTotals(inv.lines, inv.vat).total;
export const outstanding = (inv: Invoice, payments: Payment[]) => (inv.voided || !inv.sentAt ? 0 : Math.max(0, round2(invoiceTotal(inv) - paidOn(inv, payments))));

export function invoiceStatus(inv: Invoice, payments: Payment[], today: string): InvoiceStatus {
  if (inv.voided) return "void";
  if (!inv.sentAt) return "draft";
  const paid = paidOn(inv, payments);
  if (paid >= invoiceTotal(inv)) return "paid";
  if (inv.dueDate < today) return "overdue";
  return paid > 0 ? "partial" : "sent";
}

/** Tenant balance = issued invoices − cleared payments allocated to that tenant. */
export function tenantBalance(tenantId: string, invoices: Invoice[], payments: Payment[]) {
  const billed = invoices.filter((i) => i.tenantId === tenantId && i.sentAt && !i.voided).reduce((a, i) => a + invoiceTotal(i), 0);
  const paid = payments.filter((p) => p.tenantId === tenantId && counts(p.status)).reduce((a, p) => a + p.amount, 0);
  return round2(billed - paid);
}

export const BUCKETS = ["b0", "b30", "b60", "b90"] as const;
export type Bucket = (typeof BUCKETS)[number];
export const bucketFor = (daysLate: number): Bucket => (daysLate <= 30 ? "b0" : daysLate <= 60 ? "b30" : daysLate <= 90 ? "b60" : "b90");

/** Arrears ageing by days past due date. Invoices not yet due are not arrears. */
export function ageing(invoices: Invoice[], payments: Payment[], today: string) {
  const rows = new Map<string, Record<Bucket, number> & { total: number }>();
  for (const inv of invoices) {
    const owed = outstanding(inv, payments);
    if (owed <= 0 || inv.dueDate >= today) continue;
    const b = bucketFor(daysBetween(inv.dueDate, today));
    const r = rows.get(inv.tenantId) ?? { b0: 0, b30: 0, b60: 0, b90: 0, total: 0 };
    r[b] = round2(r[b] + owed); r.total = round2(r.total + owed);
    rows.set(inv.tenantId, r);
  }
  const tenants = [...rows.entries()].map(([tenantId, r]) => ({ tenantId, ...r })).sort((a, b) => b.total - a.total);
  const buckets = BUCKETS.map((b) => ({ bucket: b, amount: round2(tenants.reduce((a, r) => a + r[b], 0)), tenants: tenants.filter((r) => r[b] > 0).length }));
  return { tenants, buckets, total: round2(tenants.reduce((a, r) => a + r.total, 0)) };
}

export type StatementLine = { id: string; date: string; kind: "invoice" | "payment"; ref: string; description: string; debit: number; credit: number; balance: number };
/** Running-balance statement for one tenant between two dates (inclusive). */
export function statement(tenantId: string, invoices: Invoice[], payments: Payment[], from: string, to: string) {
  const inv = invoices.filter((i) => i.tenantId === tenantId && i.sentAt && !i.voided);
  const pay = payments.filter((p) => p.tenantId === tenantId && counts(p.status));
  const opening = round2(inv.filter((i) => i.issueDate < from).reduce((a, i) => a + invoiceTotal(i), 0) - pay.filter((p) => p.date < from).reduce((a, p) => a + p.amount, 0));
  const events = [
    ...inv.filter((i) => i.issueDate >= from && i.issueDate <= to).map((i) => ({ id: i.id, date: i.issueDate, kind: "invoice" as const, ref: i.number, description: i.lines.map((l) => l.description).join(" · "), debit: invoiceTotal(i), credit: 0 })),
    ...pay.filter((p) => p.date >= from && p.date <= to).map((p) => ({ id: p.id, date: p.date, kind: "payment" as const, ref: p.ref, description: p.method, debit: 0, credit: p.amount })),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === "invoice" ? -1 : 1));
  let bal = opening;
  const lines: StatementLine[] = events.map((e) => { bal = round2(bal + e.debit - e.credit); return { ...e, balance: bal }; });
  const invoiced = round2(events.reduce((a, e) => a + e.debit, 0));
  const paid = round2(events.reduce((a, e) => a + e.credit, 0));
  return { opening, lines, invoiced, paid, closing: round2(opening + invoiced - paid) };
}

/** Simple interest on a held deposit, deductions and the refund still due. */
export function depositSummary(d: Pick<Deposit, "amount" | "heldSince" | "ratePct" | "deductions">, today: string) {
  const days = Math.max(0, daysBetween(d.heldSince, today));
  const interest = round2((d.amount * (d.ratePct / 100) * days) / 365);
  const deductions = round2(d.deductions.reduce((a, x) => a + x.amount, 0));
  return { interest, deductions, refund: Math.max(0, round2(d.amount + interest - deductions)) };
}

/** Escalated rent, rounded to the nearest rand. */
export const escalatedRent = (rent: number, pct: number) => Math.round(rent * (1 + pct / 100));

/* ---------- Gateway checkout (mock) ---------- */
export type Outcome = "success" | "failed" | "pending" | "abandoned";
export const OUTCOMES: Outcome[] = ["success", "failed", "pending", "abandoned"];
/** What a checkout outcome records: abandoned checkouts record nothing. */
export const paymentStatusFor = (o: Outcome): PayStatus | null => (o === "success" ? "cleared" : o === "failed" ? "failed" : o === "pending" ? "pending" : null);

export function luhn(num: string) {
  const d = num.replace(/\D/g, "");
  if (d.length < 12 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}
export const TEST_CARDS = { success: "4242 4242 4242 4242", failed: "4000 0000 0000 0002", pending: "4000 0000 0000 3220" } as const;
/** Demo card numbers decide the outcome; any other valid card succeeds. */
export function cardOutcome(num: string): Outcome | "invalid" {
  const d = num.replace(/\D/g, "");
  if (d === TEST_CARDS.failed.replace(/\s/g, "")) return "failed";
  if (d === TEST_CARDS.pending.replace(/\s/g, "")) return "pending";
  return luhn(d) ? "success" : "invalid";
}

/* ---------- Proof of payment ---------- */
export const PROOF_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const PROOF_MAX = 10 * 1024 * 1024;
export const validateProof = (f: { type: string; size: number }): "type" | "size" | null => (!PROOF_TYPES.includes(f.type) ? "type" : f.size > PROOF_MAX ? "size" : null);
