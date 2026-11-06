import {
  Bell, Building2, CalendarDays, ClipboardCheck, FileText, Gavel, LayoutDashboard, Megaphone,
  BarChart3, Receipt, Settings, ShieldCheck, Users, Wrench, UserRound, Wallet, CreditCard, FolderOpen, Home, UserCog,
  type LucideIcon,
} from "lucide-react";
import { t } from "./strings";
import { permsFor } from "@/services/admin";
import { readSession } from "./session";
import { MODULES, type Module } from "./access-rules";

export type Role = "owner" | "caretaker" | "agent" | "finance" | "legal" | "tenant";
export const ROLES: Role[] = ["owner", "caretaker", "agent", "finance", "legal", "tenant"];

export type NavKey =
  | "dashboard" | "properties" | "tenants" | "requests" | "schedule" | "invoices" | "leases"
  | "change-requests" | "applications" | "staff" | "legal" | "announcements" | "reports" | "settings" | "profile";

export type NavItem = { key: NavKey; label: string; to: `/${NavKey}`; icon: LucideIcon };

const BASE: Record<NavKey, NavItem> = {
  dashboard: { key: "dashboard", label: t.nav.dashboard, to: "/dashboard", icon: LayoutDashboard },
  properties: { key: "properties", label: t.nav.properties, to: "/properties", icon: Building2 },
  tenants: { key: "tenants", label: t.nav.tenants, to: "/tenants", icon: Users },
  "change-requests": { key: "change-requests", label: t.nav.changes, to: "/change-requests", icon: UserCog },
  requests: { key: "requests", label: t.nav.requests, to: "/requests", icon: Wrench },
  schedule: { key: "schedule", label: t.nav.schedule, to: "/schedule", icon: CalendarDays },
  invoices: { key: "invoices", label: t.nav.invoices, to: "/invoices", icon: Receipt },
  leases: { key: "leases", label: t.nav.leases, to: "/leases", icon: FileText },
  applications: { key: "applications", label: t.nav.applications, to: "/applications", icon: ClipboardCheck },
  staff: { key: "staff", label: t.nav.staff, to: "/staff", icon: ShieldCheck },
  legal: { key: "legal", label: t.nav.legal, to: "/legal", icon: Gavel },
  announcements: { key: "announcements", label: t.nav.announcements, to: "/announcements", icon: Megaphone },
  reports: { key: "reports", label: t.nav.reports, to: "/reports", icon: BarChart3 },
  settings: { key: "settings", label: t.nav.settings, to: "/settings", icon: Settings },
  profile: { key: "profile", label: t.nav.profile, to: "/profile", icon: UserRound },
};

const ROLE_ITEMS: Record<Role, NavKey[]> = {
  owner: ["dashboard", "properties", "tenants", "change-requests", "requests", "schedule", "invoices", "leases", "applications", "staff", "legal", "announcements", "reports", "settings"],
  caretaker: ["dashboard", "properties", "requests", "schedule", "announcements", "settings"],
  agent: ["dashboard", "properties", "tenants", "schedule", "applications", "leases", "announcements", "settings"],
  finance: ["dashboard", "properties", "tenants", "invoices", "reports", "settings"],
  legal: ["dashboard", "tenants", "leases", "legal", "announcements", "settings"],
  tenant: ["dashboard", "requests", "invoices", "leases", "announcements", "settings"],
};

type Tab = NavItem;
const tab = (key: NavKey, label: string, icon: LucideIcon): Tab => ({ ...BASE[key], label, icon });

const ROLE_TABS: Record<Role, Tab[]> = {
  owner: [tab("dashboard", t.nav.home, Home), tab("properties", t.nav.properties, Building2), tab("requests", t.nav.requests, Wrench), tab("invoices", t.nav.money, Wallet), tab("profile", t.nav.profile, UserRound)],
  tenant: [tab("dashboard", t.nav.home, Home), tab("requests", t.nav.requests, Wrench), tab("invoices", t.nav.pay, CreditCard), tab("leases", t.nav.documents, FolderOpen), tab("profile", t.nav.profile, UserRound)],
  caretaker: [tab("dashboard", t.nav.home, Home), tab("requests", t.nav.requests, Wrench), tab("schedule", t.nav.schedule, CalendarDays), tab("properties", t.nav.properties, Building2), tab("profile", t.nav.profile, UserRound)],
  agent: [tab("dashboard", t.nav.home, Home), tab("properties", t.nav.properties, Building2), tab("applications", "Applicants", ClipboardCheck), tab("schedule", t.nav.schedule, CalendarDays), tab("profile", t.nav.profile, UserRound)],
  finance: [tab("dashboard", t.nav.home, Home), tab("invoices", t.nav.money, Wallet), tab("tenants", t.nav.tenants, Users), tab("reports", t.nav.reports, BarChart3), tab("profile", t.nav.profile, UserRound)],
  legal: [tab("dashboard", t.nav.home, Home), tab("leases", t.nav.documents, FileText), tab("legal", "Notices", Gavel), tab("tenants", t.nav.tenants, Users), tab("profile", t.nav.profile, UserRound)],
};

const ORDER = ROLE_ITEMS.owner;
const ALWAYS: NavKey[] = ["dashboard", "settings"];
/** Menu keys for a role: tenants are fixed; staff follow their effective permissions (preset + overrides). */
export function allowedKeys(role: Role): NavKey[] {
  if (role === "owner" || role === "tenant") return ROLE_ITEMS[role];
  const p = permsFor(role, readSession()?.email);
  return ORDER.filter((k) => ALWAYS.includes(k) || ((MODULES as readonly string[]).includes(k) && p[k as Module].view));
}

export function navForRole(role: Role) {
  const keys = allowedKeys(role);
  const items = keys.map((k) => BASE[k]);
  const tabs = ROLE_TABS[role].filter((x) => x.key === "profile" || keys.includes(x.key));
  const tabKeys = new Set(tabs.map((x) => x.key));
  const more = items.filter((i) => !tabKeys.has(i.key));
  return { items, tabs, more };
}

export function roleCanSee(role: Role, key: NavKey) {
  return key === "profile" || allowedKeys(role).includes(key);
}

export const NOTIFICATION_ICON = Bell;

/** Where each role lands after sign-in. Tenants see their tenant home on /dashboard. */
export function homeFor(_role: Role): "/dashboard" {
  return "/dashboard";
}
