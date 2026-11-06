// Billing mock data (Phase 7, UI only): invoices, payments, recurring schedules, deposits and rent escalations.
import { tenants, units } from "./data";

export const VAT_RATE = 0.15;
export const CHARGE_KINDS = ["rent", "utilities", "levy", "parking", "late_fee", "deposit", "other"] as const;
export type ChargeKind = (typeof CHARGE_KINDS)[number];
export const CHANNELS = ["email", "whatsapp", "sms", "inapp"] as const;
export type Channel = (typeof CHANNELS)[number];
export const PAY_METHODS = ["eft", "cash", "card", "gateway"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];
export const PAY_STATUSES = ["cleared", "pending", "failed", "reversed"] as const;
export type PayStatus = (typeof PAY_STATUSES)[number];
export type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "overdue" | "void";
export const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "sent", "partial", "paid", "overdue", "void"];

export type InvoiceLine = { id: string; kind: ChargeKind; description: string; qty: number; unitPrice: number };
export type Invoice = {
  id: string; number: string; tenantId: string; propertyId: string; unitId: string;
  issueDate: string; dueDate: string; lines: InvoiceLine[];
  /** Add 15% VAT (deposits are never VAT-able). Off for residential rent. */
  vat: boolean;
  sentAt?: string | undefined; sentVia?: Channel[] | undefined; voided?: boolean | undefined;
  scheduleId?: string | undefined; note?: string | undefined;
};
export type Proof = { name: string; size: number; type: string; url?: string | undefined };
export type Payment = {
  id: string; ref: string; tenantId?: string | undefined; invoiceId?: string | undefined;
  amount: number; method: PayMethod; date: string; status: PayStatus;
  source: "manual" | "gateway" | "bank"; proof?: Proof | undefined; note?: string | undefined;
};
export type RecurringSchedule = { id: string; tenantId: string; lines: InvoiceLine[]; vat: boolean; dayOfMonth: number; startDate: string; endDate?: string | undefined; active: boolean; createdAt: string };
export type Deduction = { id: string; item: string; amount: number; note?: string | undefined };
export type Deposit = { id: string; tenantId: string; amount: number; heldSince: string; ratePct: number; deductions: Deduction[]; status: "held" | "refunded"; refundedAt?: string | undefined; refundAmount?: number | undefined };
export type Escalation = { id: string; tenantId: string; currentRent: number; pct: number; effectiveDate: string; status: "scheduled" | "notice_sent" | "applied"; noticeSentAt?: string | undefined };
export type ReminderLog = { id: string; tenantId: string; at: string; template: string; channel: Channel };

const UTIL: Record<string, number> = { "2026-08": 720, "2026-09": 685, "2026-10": 640, "2026-11": 610 };
const MONTHS = ["2026-08", "2026-09", "2026-10", "2026-11"];
const prevMonth = (ym: string) => { const [y, m] = ym.split("-").map(Number) as [number, number]; return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; };
const monthName = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });

export function seedInvoices(): Invoice[] {
  const out: Invoice[] = [];
  let n = 1;
  const num = () => `INV-2026-${String(n++).padStart(4, "0")}`;
  for (const ym of MONTHS) {
    for (const t of tenants) {
      if (t.id === "t6") continue; // lease starts Dec 2026; only a deposit invoice so far
      const u = units.find((x) => x.id === t.unitId)!;
      const lines: InvoiceLine[] = [{ id: `l-${t.id}-${ym}-r`, kind: "rent", description: `Rent — ${monthName(ym)}`, qty: 1, unitPrice: t.rent }];
      if (t.propertyId === "p1") lines.push({ id: `l-${t.id}-${ym}-u`, kind: "utilities", description: "Water & electricity (prepaid top-up shortfall)", qty: 1, unitPrice: UTIL[ym]! });
      if (t.id === "t3") lines.push({ id: `l-${t.id}-${ym}-p`, kind: "parking", description: "Covered parking bay", qty: 1, unitPrice: 450 });
      out.push({ id: `inv-${t.id}-${ym}`, number: num(), tenantId: t.id, propertyId: t.propertyId, unitId: u.id, issueDate: `${prevMonth(ym)}-25`, dueDate: `${ym}-01`, lines, vat: false, sentAt: `${prevMonth(ym)}-25`, sentVia: ["email", "inapp"], scheduleId: `rs-${t.id}` });
    }
  }
  out.push({ id: "inv-t6-dep", number: num(), tenantId: "t6", propertyId: "p4", unitId: "u7", issueDate: "2026-10-10", dueDate: "2026-10-15", lines: [{ id: "l-t6-dep", kind: "deposit", description: "Security deposit (held in interest-bearing account)", qty: 1, unitPrice: 26500 }], vat: false, sentAt: "2026-10-10", sentVia: ["email"] });
  return out;
}

const total = (i: Invoice) => i.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);

export function seedPayments(invoices: Invoice[]): Payment[] {
  const out: Payment[] = [];
  let n = 5001;
  const add = (inv: Invoice, amount: number, date: string, extra: Partial<Payment> = {}) =>
    out.push({ id: `pay-${n}`, ref: `PAY-${n++}`, tenantId: inv.tenantId, invoiceId: inv.id, amount, method: "eft", date, status: "cleared", source: "manual", ...extra });
  for (const inv of invoices) {
    const t = inv.tenantId; const ym = inv.dueDate.slice(0, 7);
    if (t === "t2" && ym === "2026-09") { add(inv, 4000, "2026-09-30"); continue; }
    if (t === "t2" && (ym === "2026-10" || ym === "2026-11")) continue;
    if (t === "t4" && ym === "2026-08") { add(inv, 16800, "2026-08-01"); continue; } // utilities left unpaid
    if (t === "t4" && ym === "2026-11") { add(inv, 13440, "2026-10-28"); continue; }
    if (t === "t5" && ym === "2026-11") { add(inv, 25760, "2026-11-03"); continue; }
    if (t === "t6") { add(inv, 5300, "2026-10-15"); continue; }
    const card = t === "t1" && ym === "2026-11";
    add(inv, total(inv), card ? "2026-11-01" : inv.dueDate, card ? { method: "gateway", source: "gateway" } : {});
  }
  const t2nov = invoices.find((i) => i.id === "inv-t2-2026-11")!;
  const t4nov = invoices.find((i) => i.id === "inv-t4-2026-11")!;
  add(t2nov, 9500, "2026-11-02", { method: "gateway", source: "gateway", status: "failed", note: "Card declined by issuing bank" });
  add(t4nov, 3970, "2026-11-05", { status: "pending", proof: { name: "POP — Dlamini B204.pdf", size: 184_000, type: "application/pdf" } });
  // Bank lines not yet matched to a tenant (reconciliation list)
  out.push({ id: `pay-${n}`, ref: "FNB 0411 CAPITEC P VD MERWE", amount: 3000, method: "eft", date: "2026-11-04", status: "cleared", source: "bank" }); n++;
  out.push({ id: `pay-${n}`, ref: "ABSA DEP REF 88213", amount: 650, method: "eft", date: "2026-11-05", status: "cleared", source: "bank" });
  return out;
}

export function seedSchedules(): RecurringSchedule[] {
  return tenants.filter((t) => t.id !== "t6").map((t) => ({
    id: `rs-${t.id}`, tenantId: t.id, vat: false, dayOfMonth: 1, startDate: "2026-01-01", active: true, createdAt: "2025-12-15",
    lines: [{ id: `rsl-${t.id}`, kind: "rent" as const, description: "Monthly rent", qty: 1, unitPrice: t.rent }],
  }));
}

export function seedDeposits(): Deposit[] {
  const since: Record<string, string> = { t1: "2025-11-24", t2: "2025-03-01", t3: "2026-01-20", t4: "2024-11-25", t5: "2025-08-25", t6: "2026-10-15", t7: "2026-01-10" };
  return tenants.map((t) => ({
    id: `dep-${t.id}`, tenantId: t.id, amount: t.id === "t6" ? 5300 : t.rent, heldSince: since[t.id]!, ratePct: 5.25, status: "held" as const,
    deductions: t.id === "t4" ? [{ id: "dd1", item: "Repaint main bedroom (wall damage)", amount: 2400, note: "Outgoing inspection 28 Oct 2026" }, { id: "dd2", item: "Replace broken blind — lounge", amount: 850 }] : [],
  }));
}

export function seedEscalations(): Escalation[] {
  return [
    { id: "esc1", tenantId: "t1", currentRent: 12500, pct: 8, effectiveDate: "2026-12-01", status: "notice_sent", noticeSentAt: "2026-10-01" },
    { id: "esc2", tenantId: "t3", currentRent: 11200, pct: 7.5, effectiveDate: "2027-01-20", status: "scheduled" },
    { id: "esc3", tenantId: "t7", currentRent: 6500, pct: 6, effectiveDate: "2026-01-15", status: "applied", noticeSentAt: "2025-12-01" },
  ];
}
