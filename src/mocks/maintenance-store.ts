// Browser-persisted requests & maintenance store (UI phases). Shares the portfolio refresh event so open screens update.
import { PORTFOLIO_EVENT } from "./portfolio-store";
import { seedContractors, seedRequests, seedSchedule, type Contractor, type MaintRequest, type PreventiveTask } from "./maintenance";

type State = { requests: MaintRequest[]; contractors: Contractor[]; schedule: PreventiveTask[] };
const KEY = "nestly.maintenance.v1";
let state: State | null = null;
const seed = (): State => ({ requests: seedRequests(), contractors: seedContractors(), schedule: seedSchedule() });

export function getMaint(): State {
  if (state) return state;
  if (typeof window !== "undefined") {
    try { const raw = localStorage.getItem(KEY); if (raw) return (state = JSON.parse(raw) as State); } catch { /* seed */ }
  }
  return (state = seed());
}

export function commitMaint(mut: (s: State) => void): boolean {
  const s = getMaint();
  mut(s);
  let ok = true;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { ok = false; }
    window.dispatchEvent(new Event(PORTFOLIO_EVENT));
  }
  return ok;
}
