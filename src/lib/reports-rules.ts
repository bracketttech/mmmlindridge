// Report filters and small aggregates (pure, tested).

export const RANGES = ["3m", "6m", "12m", "ytd", "custom"] as const;
export type Range = (typeof RANGES)[number];
export type MonthPoint = { month: string }; // "YYYY-MM"

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Inclusive month bounds ("YYYY-MM") for a range ending in the current month. */
export function rangeBounds(range: Range, todayIso: string, custom?: { from: string; to: string }): { from: string; to: string } {
  const now = new Date(`${todayIso.slice(0, 10)}T00:00:00`);
  const to = ym(now);
  if (range === "custom") {
    const f = custom?.from?.slice(0, 7) || to;
    const t = custom?.to?.slice(0, 7) || to;
    return f <= t ? { from: f, to: t } : { from: t, to: f };
  }
  if (range === "ytd") return { from: `${now.getFullYear()}-01`, to };
  const n = range === "3m" ? 3 : range === "6m" ? 6 : 12;
  const start = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
  return { from: ym(start), to };
}

export const inRange = <T extends MonthPoint>(rows: T[], b: { from: string; to: string }) => rows.filter((r) => r.month >= b.from && r.month <= b.to);

/** Sums several per-property monthly series into one portfolio series. */
export function sumByMonth<T extends MonthPoint>(rows: T[], keys: (keyof T)[]): T[] {
  const map = new Map<string, T>();
  for (const r of rows) {
    const cur = map.get(r.month);
    if (!cur) { map.set(r.month, { ...r }); continue; }
    for (const k of keys) (cur[k] as number) = (cur[k] as number) + (r[k] as number);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Tenant turnover: move-outs as a share of occupied units over the period. */
export const turnoverPct = (moveOuts: number, occupied: number) => (occupied > 0 ? Math.round((moveOuts / occupied) * 1000) / 10 : 0);

export const daysVacant = (sinceIso: string, todayIso: string) =>
  Math.max(0, Math.round((new Date(`${todayIso.slice(0, 10)}T00:00:00`).getTime() - new Date(`${sinceIso.slice(0, 10)}T00:00:00`).getTime()) / 864e5));
