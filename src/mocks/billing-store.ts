// Browser-persisted billing store (UI phases). Shares the portfolio refresh event so open screens update.
import { PORTFOLIO_EVENT } from "./portfolio-store";
import { seedDeposits, seedEscalations, seedInvoices, seedPayments, seedSchedules, type Deposit, type Escalation, type Invoice, type Payment, type RecurringSchedule, type ReminderLog } from "./billing";

export type BillingState = { invoices: Invoice[]; payments: Payment[]; schedules: RecurringSchedule[]; deposits: Deposit[]; escalations: Escalation[]; reminders: ReminderLog[] };
const KEY = "nestly.billing.v1";
let state: BillingState | null = null;
export function seedBilling(): BillingState {
  const invoices = seedInvoices();
  return { invoices, payments: seedPayments(invoices), schedules: seedSchedules(), deposits: seedDeposits(), escalations: seedEscalations(), reminders: [] };
}

export function getBilling(): BillingState {
  if (state) return state;
  if (typeof window !== "undefined") {
    try { const raw = localStorage.getItem(KEY); if (raw) return (state = JSON.parse(raw) as BillingState); } catch { /* seed */ }
  }
  return (state = seedBilling());
}

export function commitBilling(mut: (s: BillingState) => void): boolean {
  const s = getBilling();
  mut(s);
  let ok = true;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { ok = false; }
    window.dispatchEvent(new Event(PORTFOLIO_EVENT));
  }
  return ok;
}
