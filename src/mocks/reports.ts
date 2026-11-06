// Deterministic monthly history for Reports & Insights (UI only). A real backend aggregates ledgers instead.
export type MonthRow = { month: string; propertyId: string; income: number; expenses: number; maintenance: number; moveIns: number; moveOuts: number };

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
const pad = (n: number) => String(n).padStart(2, "0");

/** 24 months of history up to the current month for one property. */
export function historyFor(propertyId: string, rentRoll: number, units: number, todayIso: string, createdAt?: string): MonthRow[] {
  const r = rng(propertyId);
  const now = new Date(`${todayIso.slice(0, 10)}T00:00:00`);
  const rows: MonthRow[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    if (createdAt && month < createdAt.slice(0, 7)) { r(); r(); r(); r(); continue; }
    const growth = 1 - i * 0.004;
    const collection = 0.86 + r() * 0.13;
    const income = Math.round(rentRoll * growth * collection);
    const rainy = d.getMonth() >= 9 || d.getMonth() <= 2; // Highveld summer storms
    const maintenance = Math.round((units * 180 + r() * units * 520) * (rainy ? 1.35 : 1));
    const fixed = Math.round(rentRoll * 0.18);
    rows.push({ month, propertyId, income, expenses: fixed + maintenance, maintenance, moveIns: r() < 0.18 * Math.min(units, 6) / 3 ? 1 + Math.floor(r() * 2) : 0, moveOuts: r() < 0.16 * Math.min(units, 6) / 3 ? 1 : 0 });
  }
  return rows;
}

/** Mock "vacant since" for a vacant unit (days ago, 6–120). */
export function vacantSinceDays(unitId: string) {
  const r = rng(`vac-${unitId}`);
  return 6 + Math.floor(r() * 115);
}
