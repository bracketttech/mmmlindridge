// Browser-persisted tenancy store (UI phases). Shares the portfolio refresh event so open screens update.
import { PORTFOLIO_EVENT } from "./portfolio-store";
import { seedChanges, seedHistory, seedTenants, type ChangeRequest, type HistoryEntry, type SentLink, type TenantRecord } from "./tenancy";

type State = { tenants: TenantRecord[]; changes: ChangeRequest[]; history: HistoryEntry[]; links: SentLink[]; avatars: Record<string, string> };
const KEY = "nestly.tenancy.v1";
let state: State | null = null;
const seed = (): State => ({ tenants: seedTenants(), changes: seedChanges(), history: seedHistory(), links: [], avatars: {} });

export function getTenancy(): State {
  if (state) return state;
  if (typeof window !== "undefined") {
    try { const raw = localStorage.getItem(KEY); if (raw) return (state = JSON.parse(raw) as State); } catch { /* seed */ }
  }
  return (state = seed());
}

export function commitTenancy(mut: (s: State) => void): boolean {
  const s = getTenancy();
  mut(s);
  let ok = true;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { ok = false; }
    window.dispatchEvent(new Event(PORTFOLIO_EVENT));
  }
  return ok;
}
