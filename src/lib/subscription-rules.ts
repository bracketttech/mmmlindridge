// Nestly's own subscription pricing (pure, tested): each property is billed at the tier that fits its tenant count.
// Tier prices are placeholders until the pricing open item in DOCS is confirmed.
import type { Plan } from "@/mocks/plans";

export type Cycle = "monthly" | "annual";
/** Annual billing charges 10 months for 12 ("2 months free"). */
export const ANNUAL_MONTHS_CHARGED = 10;

/** Smallest tier whose limit covers the tenant count; Custom when no priced tier fits. */
export function tierFor(tenants: number, plans: Plan[]): Plan {
  const priced = plans.filter((p) => p.maxTenants !== null).sort((a, b) => a.maxTenants! - b.maxTenants!);
  return priced.find((p) => tenants <= p.maxTenants!) ?? plans.find((p) => p.maxTenants === null)!;
}

export const isOverLimit = (tenants: number, plan: Plan) => plan.maxTenants !== null && tenants > plan.maxTenants;
export const usagePct = (tenants: number, plan: Plan) => (plan.maxTenants ? Math.min(100, Math.round((tenants / plan.maxTenants) * 100)) : 0);
/** A property can only move to a tier that still fits its current tenants. */
export const canMoveTo = (tenants: number, target: Plan) => target.maxTenants === null || tenants <= target.maxTenants;

export type QuoteLine = { id: string; name: string; tenants: number; plan: Plan; monthly: number | null };
export type Quote = { lines: QuoteLine[]; monthly: number; annual: number; perMonthAnnual: number; custom: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Monthly cost across properties. `tiers` pins a property to a chosen tier (upgrade/downgrade);
 * otherwise the tier follows the tenant count. Custom tiers are quoted separately and excluded from totals.
 */
export function quote(rows: { id: string; name: string; tenants: number }[], plans: Plan[], tiers: Record<string, Plan["id"]> = {}): Quote {
  const lines = rows.map((r): QuoteLine => {
    const pinned = plans.find((p) => p.id === tiers[r.id]);
    const plan = pinned && canMoveTo(r.tenants, pinned) ? pinned : tierFor(r.tenants, plans);
    return { ...r, plan, monthly: plan.monthly };
  });
  const monthly = round2(lines.reduce((a, l) => a + (l.monthly ?? 0), 0));
  const annual = round2(monthly * ANNUAL_MONTHS_CHARGED);
  return { lines, monthly, annual, perMonthAnnual: round2(annual / 12), custom: lines.filter((l) => l.monthly === null).length };
}
