// Browser-persisted mock store for the UI phases. Services wrap it; replace with real API calls later.
import { seedDocuments, seedProperties, seedUnits, type DocumentRecord, type PropertyRecord, type UnitRecord } from "./portfolio";

type State = { properties: PropertyRecord[]; units: UnitRecord[]; documents: DocumentRecord[] };
const KEY = "nestly.portfolio.v1";
export const PORTFOLIO_EVENT = "nestly:portfolio";

let state: State | null = null;
/** File previews for uploads made this session (object URLs are not persisted). */
export const previewUrls = new Map<string, string>();

const seed = (): State => ({ properties: seedProperties(), units: seedUnits(), documents: seedDocuments() });

export function getState(): State {
  if (state) return state;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return (state = JSON.parse(raw) as State);
    } catch { /* fall through to seed */ }
  }
  return (state = seed());
}

/** Applies a change, saves it and tells open screens to refresh. Returns false if browser storage is full. */
export function commit(mut: (s: State) => void): boolean {
  const s = getState();
  mut(s);
  let ok = true;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { ok = false; }
    window.dispatchEvent(new Event(PORTFOLIO_EVENT));
  }
  return ok;
}

export function resetPortfolio() {
  state = seed();
  commit(() => {});
}

export const newId = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
