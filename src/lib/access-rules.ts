// Permission model (pure, tested). Role presets + per-person overrides, scoped per property.
// The real backend enforces the same rules with RLS later; the UI only hides what isn't allowed.
import type { NavKey, Role } from "./nav";

export const MODULES = ["properties", "tenants", "change-requests", "requests", "schedule", "invoices", "leases", "applications", "legal", "announcements", "reports", "staff"] as const satisfies readonly NavKey[];
export type Module = (typeof MODULES)[number];
export const ACTIONS = ["view", "create", "edit", "delete", "approve", "export"] as const;
export type Action = (typeof ACTIONS)[number];
export type StaffRole = Exclude<Role, "owner" | "tenant">;
export const STAFF_ROLES: StaffRole[] = ["caretaker", "agent", "finance", "legal"];

export type ActionSet = Record<Action, boolean>;
export type PermSet = Record<Module, ActionSet>;
export type Overrides = Partial<Record<Module, Partial<ActionSet>>>;
export type Scope = "all" | string[];

/** Only the owner can ever manage staff and permissions. */
export const LOCKED_MODULES: Module[] = ["staff"];

const KEY: Record<string, Action> = { v: "view", c: "create", e: "edit", d: "delete", a: "approve", x: "export" };
/** "vce" → view + create + edit. */
export const actions = (code = ""): ActionSet => {
  const out = { view: false, create: false, edit: false, delete: false, approve: false, export: false };
  for (const ch of code) { const k = KEY[ch]; if (k) out[k] = true; }
  return out;
};
const matrix = (codes: Partial<Record<Module, string>>): PermSet =>
  Object.fromEntries(MODULES.map((m) => [m, actions(codes[m])])) as PermSet;

/** Starting presets — "view" mirrors each role's menu; other actions follow the product overview matrix. */
export const DEFAULT_PRESETS: Record<StaffRole, PermSet> = {
  caretaker: matrix({ properties: "v", requests: "vcea", schedule: "vce", announcements: "vc" }),
  agent: matrix({ properties: "v", tenants: "vce", schedule: "vce", applications: "vce", leases: "vce", announcements: "v" }),
  finance: matrix({ properties: "v", tenants: "v", invoices: "vcedax", reports: "vx" }),
  legal: matrix({ tenants: "v", leases: "vcedax", legal: "vcedax", announcements: "vc" }),
};
export const OWNER_PERMS: PermSet = matrix(Object.fromEntries(MODULES.map((m) => [m, "vcedax"])));
export const NO_PERMS: PermSet = matrix({});

export function effective(preset: PermSet, overrides: Overrides = {}): PermSet {
  return Object.fromEntries(MODULES.map((m) => {
    if (LOCKED_MODULES.includes(m)) return [m, actions()];
    const set = { ...preset[m], ...(overrides[m] ?? {}) };
    // Every action needs view; without view the whole module is off.
    if (!set.view) return [m, actions()];
    return [m, set];
  })) as PermSet;
}

export const allows = (p: PermSet, m: Module, a: Action) => !!p[m]?.[a];

export const isOverridden = (preset: PermSet, o: Overrides, m: Module, a: Action) =>
  o[m]?.[a] !== undefined && o[m]![a] !== preset[m][a];

export const overrideCount = (preset: PermSet, o: Overrides) =>
  MODULES.reduce((n, m) => n + ACTIONS.filter((a) => isOverridden(preset, o, m, a)).length, 0);

/**
 * Turns one cell on/off and returns the new overrides.
 * Turning an action on also turns view on; turning view off turns the whole module off.
 * Cells that end up equal to the preset are dropped so they follow future preset changes.
 */
export function toggle(preset: PermSet, o: Overrides, m: Module, a: Action, value: boolean): Overrides {
  if (LOCKED_MODULES.includes(m)) return o;
  const current = effective(preset, o)[m];
  const next: ActionSet = { ...current, [a]: value };
  if (a !== "view" && value) next.view = true;
  if (a === "view" && !value) ACTIONS.forEach((k) => (next[k] = false));
  const row: Partial<ActionSet> = {};
  ACTIONS.forEach((k) => { if (next[k] !== preset[m][k]) row[k] = next[k]; });
  const out: Overrides = { ...o };
  if (Object.keys(row).length) out[m] = row; else delete out[m];
  return out;
}

/** Same rules, applied to a role preset itself (owner edits the role defaults). */
export function togglePreset(preset: PermSet, m: Module, a: Action, value: boolean): PermSet {
  if (LOCKED_MODULES.includes(m)) return preset;
  const next: ActionSet = { ...preset[m], [a]: value };
  if (a !== "view" && value) next.view = true;
  if (a === "view" && !value) ACTIONS.forEach((k) => (next[k] = false));
  return { ...preset, [m]: next };
}

/** Modules whose pages show in the menu. */
export const visibleModules = (p: PermSet): Module[] => MODULES.filter((m) => p[m].view);

/* ---------- Property scope ---------- */
export const inScope = (scope: Scope, propertyId: string) => scope === "all" || scope.includes(propertyId);

/** The property the switcher may show: scoped staff never get the portfolio view or someone else's building. */
export function scopedPropertyId(scope: Scope, current: string): string {
  if (scope === "all") return current;
  if (scope.includes(current)) return current;
  return scope[0] ?? "none";
}

/* ---------- Spend limit ---------- */
/** Caretakers approve repair spend up to their limit; anything above goes to the owner. */
export function canApproveSpend(p: PermSet, amount: number, limit?: number): boolean {
  if (!allows(p, "requests", "approve")) return false;
  return limit === undefined || amount <= limit;
}
