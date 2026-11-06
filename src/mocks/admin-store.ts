// Browser-persisted admin store (Phase 9 UI). Shares the portfolio refresh event so open screens update.
import type { PermSet, StaffRole } from "@/lib/access-rules";
import { PORTFOLIO_EVENT } from "./portfolio-store";
import {
  seedAnnouncements, seedAudit, seedCases, seedCompany, seedNotices, seedPresets, seedStaff, seedSubscription, seedVisits,
  type Announcement, type AuditRow, type CalEventRecord, type CalOverride, type Company, type EvictionCase, type Notice, type NotifPrefs, type ProfilePrefs, type StaffMember, type Subscription,
} from "./admin";

export type AdminState = {
  staff: StaffMember[]; presets: Record<StaffRole, PermSet>;
  notices: Notice[]; cases: EvictionCase[];
  events: CalEventRecord[]; eventOverrides: Record<string, CalOverride>;
  announcements: Announcement[];
  company: Company; prefs: Record<string, NotifPrefs>; profiles: Record<string, ProfilePrefs>;
  subscription: Subscription; audit: AuditRow[];
};
const KEY = "nestly.admin.v1";
let state: AdminState | null = null;
const seed = (): AdminState => ({
  staff: seedStaff(), presets: seedPresets(), notices: seedNotices(), cases: seedCases(), events: seedVisits(), eventOverrides: {},
  announcements: seedAnnouncements(), company: seedCompany(), prefs: {}, profiles: {}, subscription: seedSubscription(), audit: seedAudit(),
});

export function getAdmin(): AdminState {
  if (state) return state;
  if (typeof window !== "undefined") {
    try { const raw = localStorage.getItem(KEY); if (raw) return (state = { ...seed(), ...(JSON.parse(raw) as Partial<AdminState>) }); } catch { /* seed */ }
  }
  return (state = seed());
}

export function commitAdmin(mut: (s: AdminState) => void): boolean {
  const s = getAdmin();
  mut(s);
  let ok = true;
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { ok = false; }
    window.dispatchEvent(new Event(PORTFOLIO_EVENT));
  }
  return ok;
}
