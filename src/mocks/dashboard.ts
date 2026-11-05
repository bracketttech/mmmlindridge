// Per-property dashboard mock data (deterministic). "all" aggregates every property.
import { properties, tenants, requests, invoices, units } from "./data";

export const MONTHS_12 = ["Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026", "Oct 2026", "Nov 2026"];

type PropStats = {
  rentRoll: number; // monthly rent due
  rates: number[]; // 12 monthly collection rates
  ageing: [number, number, number, number]; // ZAR in 0–30, 31–60, 61–90, 90+
  openRequests: number; highPriority: number; expiring: number; vacant: number; applications: number; viewings: number; notices: number; breaches: number; jobsToday: number;
};

const STATS: Record<string, PropStats> = {
  p1: { rentRoll: 312000, rates: [0.91, 0.93, 0.89, 0.94, 0.92, 0.95, 0.9, 0.93, 0.96, 0.94, 0.92, 0.88], ageing: [18400, 8900, 4200, 2600], openRequests: 5, highPriority: 2, expiring: 3, vacant: 2, applications: 6, viewings: 4, notices: 1, breaches: 1, jobsToday: 3 },
  p2: { rentRoll: 176000, rates: [0.95, 0.96, 0.94, 0.97, 0.95, 0.96, 0.97, 0.94, 0.95, 0.98, 0.96, 0.93], ageing: [6200, 0, 1100, 0], openRequests: 2, highPriority: 0, expiring: 1, vacant: 2, applications: 3, viewings: 2, notices: 0, breaches: 0, jobsToday: 1 },
  p3: { rentRoll: 154000, rates: [0.88, 0.9, 0.86, 0.91, 0.89, 0.92, 0.88, 0.9, 0.93, 0.91, 0.94, 0.9], ageing: [9800, 5600, 0, 3400], openRequests: 3, highPriority: 1, expiring: 2, vacant: 1, applications: 2, viewings: 1, notices: 1, breaches: 0, jobsToday: 2 },
  p4: { rentRoll: 198500, rates: [0.97, 0.98, 0.96, 0.99, 0.97, 0.98, 0.99, 0.97, 0.98, 0.97, 0.99, 0.95], ageing: [26500, 0, 0, 0], openRequests: 1, highPriority: 0, expiring: 1, vacant: 1, applications: 4, viewings: 3, notices: 0, breaches: 0, jobsToday: 0 },
};

const IDS = Object.keys(STATS);
const pick = (pid: string) => (pid === "all" ? IDS : IDS.includes(pid) ? [pid] : IDS);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export type AttentionItem = { id: string; title: string; meta: string; tone: "danger" | "warning" | "info" | "success"; propertyId: string };
export type ActivityItem = { id: string; title: string; meta: string; propertyId: string };
export type LeaseExpiry = { id: string; tenant: string; unit: string; property: string; endsOn: string; propertyId: string };

const ATTENTION: AttentionItem[] = [
  { id: "a1", title: "Geyser leaking in main bathroom — A101", meta: "High priority · logged 3 Nov 2026", tone: "danger", propertyId: "p1" },
  { id: "a2", title: "Pieter van der Merwe is 36 days in arrears", meta: "R 4 895,00 outstanding · A102", tone: "warning", propertyId: "p1" },
  { id: "a3", title: "Lease for B204 ends 30 Nov 2026", meta: "Renewal not yet sent", tone: "info", propertyId: "p1" },
  { id: "a4", title: "Loft 7 vacant for 21 days", meta: "3 applications waiting for review", tone: "info", propertyId: "p2" },
  { id: "a5", title: "Gate motor not responding after load-shedding", meta: "In progress · Bongani Zulu", tone: "warning", propertyId: "p3" },
  { id: "a6", title: "Payment failed at gateway — PH1", meta: "R 26 500,00 · retry requested", tone: "danger", propertyId: "p4" },
  { id: "a7", title: "Compliance certificate expires 12 Dec 2026", meta: "Electrical CoC · Villa block", tone: "info", propertyId: "p3" },
];

const ACTIVITY: ActivityItem[] = [
  { id: "e1", title: "Thandiwe Nkosi paid R 12 500,00", meta: "1 Nov 2026 · 08:14 · A101", propertyId: "p1" },
  { id: "e2", title: "Lerato Mokoena paid R 11 200,00", meta: "2 Nov 2026 · 10:02 · Loft 3", propertyId: "p2" },
  { id: "e3", title: "Aisha Patel paid R 25 760,00 (partial)", meta: "3 Nov 2026 · 07:45 · Villa 2", propertyId: "p3" },
  { id: "e4", title: "New fault logged: geyser leaking", meta: "3 Nov 2026 · 18:40 · A101", propertyId: "p1" },
  { id: "e5", title: "Bongani Zulu assigned to gate motor", meta: "4 Nov 2026 · 09:12 · Bryanston Villas", propertyId: "p3" },
  { id: "e6", title: "Lease signed by Johannes Botha-Fitzgerald Mahlangu", meta: "15 Oct 2026 · PH1", propertyId: "p4" },
  { id: "e7", title: "Application received for Loft 7", meta: "4 Nov 2026 · 14:30 · Rosebank Lofts", propertyId: "p2" },
];

const EXPIRIES: LeaseExpiry[] = [
  { id: "l1", tenant: "Sipho Dlamini", unit: "B204", property: "Sunset Gardens", endsOn: "2026-11-30", propertyId: "p1" },
  { id: "l2", tenant: "Pieter van der Merwe", unit: "A102", property: "Sunset Gardens", endsOn: "2026-12-31", propertyId: "p1" },
  { id: "l3", tenant: "Lerato Mokoena", unit: "Loft 3", property: "Rosebank Lofts", endsOn: "2027-01-31", propertyId: "p2" },
  { id: "l4", tenant: "Naledi Khumalo", unit: "Villa 5", property: "Bryanston Villas", endsOn: "2026-12-15", propertyId: "p3" },
  { id: "l5", tenant: "Johannes Botha-Fitzgerald Mahlangu", unit: "PH1", property: "Camps Bay Ocean View Residences & Penthouse Collection", endsOn: "2027-02-28", propertyId: "p4" },
];

export function buildDashboard(propertyId: string) {
  const ids = pick(propertyId);
  const st = ids.map((i) => STATS[i]!);
  const props = properties.filter((p) => ids.includes(p.id));
  const totalUnits = sum(props.map((p) => p.units));
  const occupied = sum(props.map((p) => p.occupied));
  const series = MONTHS_12.map((month, m) => {
    const due = sum(st.map((s) => s.rentRoll));
    const collected = Math.round(sum(st.map((s) => s.rentRoll * s.rates[m]!)));
    return { month, collected, previous: due };
  });
  const last = series[series.length - 1]!;
  const prev = series[series.length - 2]!;
  const ageing = [0, 1, 2, 3].map((b) => sum(st.map((s) => s.ageing[b]!))) as [number, number, number, number];
  const arrears = sum(ageing);
  const n = (k: keyof PropStats) => sum(st.map((s) => s[k] as number));
  const inScope = <T extends { propertyId: string }>(xs: T[]) => xs.filter((x) => ids.includes(x.propertyId));
  return {
    propertyId,
    featured: props[0]!,
    properties: props,
    totals: { units: totalUnits, occupied, occupancy: Math.round((occupied / totalUnits) * 100) },
    rent: { due: last.previous, collected: last.collected, rate: Math.round((last.collected / last.previous) * 100), deltaPct: Math.round(((last.collected - prev.collected) / prev.collected) * 1000) / 10 },
    series,
    ticks: series.slice(-8).map((s) => s.collected),
    arrears: { total: arrears, ageing, currentPct: arrears ? Math.round((ageing[0] / arrears) * 100) : 100 },
    counts: { openRequests: n("openRequests"), highPriority: n("highPriority"), expiring: n("expiring"), vacant: n("vacant"), applications: n("applications"), viewings: n("viewings"), notices: n("notices"), breaches: n("breaches"), jobsToday: n("jobsToday") },
    attention: inScope(ATTENTION),
    activity: inScope(ACTIVITY),
    expiries: inScope(EXPIRIES).sort((a, b) => a.endsOn.localeCompare(b.endsOn)),
    requests: requests.filter((r) => ids.includes(tenants.find((t) => t.id === r.tenantId)?.propertyId ?? "")),
    overdue: invoices.filter((i) => i.status !== "paid" && ids.includes(tenants.find((t) => t.id === i.tenantId)?.propertyId ?? "")),
    vacantUnits: units.filter((u) => u.status !== "occupied" && ids.includes(u.propertyId)),
  };
}
export type DashboardData = ReturnType<typeof buildDashboard>;

export type SearchResult = { id: string; kind: "tenant" | "property" | "invoice" | "request"; title: string; sub: string; to: "/tenants" | "/properties" | "/invoices" | "/requests" };
export function searchAll(q: string): SearchResult[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const has = (...xs: string[]) => xs.some((x) => x.toLowerCase().includes(s));
  return [
    ...properties.filter((p) => has(p.name, p.suburb, p.address)).map((p) => ({ id: p.id, kind: "property" as const, title: p.name, sub: `${p.address}, ${p.suburb}`, to: "/properties" as const })),
    ...tenants.filter((t) => has(t.name, t.email, t.phone)).map((t) => ({ id: t.id, kind: "tenant" as const, title: t.name, sub: t.email, to: "/tenants" as const })),
    ...invoices.filter((i) => has(i.id)).map((i) => ({ id: i.id, kind: "invoice" as const, title: i.id, sub: i.status, to: "/invoices" as const })),
    ...requests.filter((r) => has(r.title)).map((r) => ({ id: r.id, kind: "request" as const, title: r.title, sub: r.status.replace("_", " "), to: "/requests" as const })),
  ].slice(0, 12);
}
