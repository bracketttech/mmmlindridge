// Browser-persisted leasing store (UI phases). Shares the portfolio refresh event so open screens update.
import { PORTFOLIO_EVENT } from "./portfolio-store";
import { seedApplications, seedEnvelopes, seedInspections, seedLeases, seedTemplates, type Application, type Envelope, type Inspection, type Lease, type LeaseTemplate } from "./leasing";

export type LeasingState = { leases: Lease[]; templates: LeaseTemplate[]; envelopes: Envelope[]; applications: Application[]; inspections: Inspection[] };
const KEY = "nestly.leasing.v1";
let state: LeasingState | null = null;
export const seedLeasing = (): LeasingState => ({ leases: seedLeases(), templates: seedTemplates(), envelopes: seedEnvelopes(), applications: seedApplications(), inspections: seedInspections() });

export function getLeasing(): LeasingState {
  if (state) return state;
  if (typeof window !== "undefined") {
    try { const raw = localStorage.getItem(KEY); if (raw) return (state = JSON.parse(raw) as LeasingState); } catch { /* seed */ }
  }
  return (state = seedLeasing());
}

export function commitLeasing(mut: (s: LeasingState) => void): boolean {
  const s = getLeasing();
  mut(s);
  let ok = true;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { ok = false; }
    window.dispatchEvent(new Event(PORTFOLIO_EVENT));
  }
  return ok;
}
