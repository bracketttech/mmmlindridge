// Mock session stored in the browser (UI-only phases). Replaced by real auth in Phase 11+.
import type { Role } from "./nav";

export type MockSession = { email: string; name: string; role: Role; signedInAt: string };
const KEY = "nestly.session";

export function readSession(): MockSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MockSession) : null;
  } catch {
    return null;
  }
}
export function writeSession(s: MockSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
  localStorage.setItem("nestly.role", JSON.stringify(s.role));
}
export function clearSession() {
  localStorage.removeItem(KEY);
}
