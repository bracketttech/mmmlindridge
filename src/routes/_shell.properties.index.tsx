import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Building2, Plus, Search, SearchX, X } from "lucide-react";
import { Placeholder } from "@/components/nestly/Placeholder";
import { EmptyState, GlassCard, PageHeader, PillButton, SegmentedChips, Skel, Stagger } from "@/components/nestly/primitives";
import { KpiTile } from "@/components/nestly/composites";
import { PropertyCard } from "@/components/nestly/properties/PropertyCard";
import { usePropertyDelete } from "@/components/nestly/properties/actions";
import { fill, occupancyStatuses, useCanManage, type OccupancyStatus } from "@/components/nestly/properties/shared";
import { propertyService, type Property } from "@/services";
import { PROPERTY_TYPES } from "@/mocks/portfolio";
import { PROVINCES } from "@/mocks/plans";
import { useAppState } from "@/lib/app-state";
import { roleCanSee } from "@/lib/nav";
import { useData } from "@/lib/use-data";
import { formatCompactZAR, formatZAR } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

type Search = { q?: string; type?: string; province?: string; status?: "all" | OccupancyStatus; demo?: "empty" };
const STATUSES = ["all", "fully_let", "vacancies", "maintenance", "setup"] as const;

export const Route = createFileRoute("/_shell/properties/")({
  head: () => pageHead("Properties", "Every building in your portfolio with occupancy, units and rent roll."),
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" && s.q ? s.q : undefined,
    type: typeof s.type === "string" && s.type ? s.type : undefined,
    province: typeof s.province === "string" && s.province ? s.province : undefined,
    status: STATUSES.includes(s.status as never) && s.status !== "all" ? (s.status as OccupancyStatus) : undefined,
    demo: s.demo === "empty" ? "empty" : undefined,
  }),
  component: PropertiesPage,
});

export function filterProperties(list: Property[], f: Search) {
  const q = f.q?.trim().toLowerCase() ?? "";
  return list.filter((p) =>
    (!q || [p.name, p.suburb, p.city, p.address].some((x) => x.toLowerCase().includes(q))) &&
    (!f.type || p.type === f.type) &&
    (!f.province || p.province === f.province) &&
    (!f.status || occupancyStatuses(p).includes(f.status)));
}

const selectCls = "h-10 min-w-0 rounded-full border border-border-soft bg-surface-solid pl-4 pr-9 text-[13px] font-medium text-ink-900 outline-none focus:border-olive-700 focus:ring-3 focus:ring-olive-200";

function PropertiesPage() {
  const { role } = useAppState();
  const canManage = useCanManage();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/properties/" });
  const { data, loading, error, reload } = useData(() => propertyService.list(), []);
  const del = usePropertyDelete();
  const p = t.props;

  const all = useMemo(() => (search.demo === "empty" ? [] : data ?? []), [data, search.demo]);
  const rows = useMemo(() => filterProperties(all, search), [all, search]);
  const set = (patch: Partial<Search>) => navigate({ search: (s: Search) => ({ ...s, ...patch }), replace: true });
  const hasFilters = !!(search.q || search.type || search.province || search.status);

  if (!roleCanSee(role, "properties")) return <Placeholder navKey="properties" title={p.title} muted={p.muted} />;

  const units = all.reduce((a, x) => a + x.units, 0);
  const occupied = all.reduce((a, x) => a + x.occupied, 0);
  const vacant = all.reduce((a, x) => a + x.vacant, 0);
  const rentRoll = all.reduce((a, x) => a + x.rentRoll, 0);
  const occPct = units ? Math.round((occupied / units) * 100) : 0;
  const statusCount = (s: (typeof STATUSES)[number]) => (s === "all" ? all.length : all.filter((x) => occupancyStatuses(x).includes(s)).length);

  const addBtn = canManage && (
    <Link to="/properties/new" className="contents">
      <PillButton icon={<Plus className="h-4 w-4" />} tabIndex={-1}>{p.add}</PillButton>
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={p.title} muted={p.muted} sub={loading ? undefined : fill(p.sub, { n: all.length, u: units, o: occPct })} actions={addBtn} />

      {!loading && !error && all.length === 0 ? (
        <GlassCard hover={false} className="animate-rise" style={{ animationDelay: "120ms" }}>
          <EmptyState icon={<Building2 className="h-6 w-6" />} title={p.emptyTitle} body={p.emptyBody} action={addBtn || <p className="text-[13px] text-ink-500">{p.viewOnly}</p>} />
        </GlassCard>
      ) : (
        <>
          <Stagger className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <KpiTile loading={loading} label={t.nav.properties} value={String(all.length)} unit={t.props.card.units.replace("units", "buildings")} variant="tick-bar" visual={all.map((x) => x.units)} tip={all.map((x) => `${x.name}: ${x.units} units`).join(" · ")} />
            <KpiTile loading={loading} label={t.props.detail.occupancy} value={`${occPct}%`} unit={`${occupied}/${units}`} variant="donut" percent={occPct} tip={`${occupied} of ${units} units let`} />
            <KpiTile loading={loading} label={t.dash.vacant} value={String(vacant)} unit={t.dash.ready} variant="plain" delta={String(all.reduce((a, x) => a + x.maintenance, 0))} deltaLabel={t.units.statuses.maintenance.toLowerCase()} />
            <KpiTile loading={loading} label={t.props.detail.rentRoll} value={formatCompactZAR(rentRoll)} unit="/ month" variant="sparkline" visual={all.map((x) => x.rentRoll)} tip={formatZAR(rentRoll)} />
          </Stagger>

          <GlassCard hover={false} className="animate-rise space-y-3 p-3 md:p-4" style={{ animationDelay: "300ms" }}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="relative flex min-w-0 flex-1 items-center">
                <span className="sr-only">{p.search}</span>
                <Search aria-hidden className="pointer-events-none absolute left-4 h-4 w-4 text-ink-500" />
                <input type="search" value={search.q ?? ""} onChange={(e) => set({ q: e.target.value || undefined })} placeholder={p.search}
                  className="h-11 w-full rounded-full border border-border-soft bg-surface-solid pl-11 pr-4 text-[14px] text-ink-900 outline-none placeholder:text-ink-500/80 focus:border-olive-700 focus:ring-3 focus:ring-olive-200" />
              </label>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <select aria-label={p.type} value={search.type ?? ""} onChange={(e) => set({ type: e.target.value || undefined })} className={selectCls}>
                  <option value="">{p.anyType}</option>
                  {PROPERTY_TYPES.map((x) => <option key={x} value={x}>{p.types[x]}</option>)}
                </select>
                <select aria-label={p.province} value={search.province ?? ""} onChange={(e) => set({ province: e.target.value || undefined })} className={selectCls}>
                  <option value="">{p.anyProvince}</option>
                  {PROVINCES.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SegmentedChips label={p.status} value={search.status ?? "all"} onChange={(v) => set({ status: v === "all" ? undefined : v })}
                options={STATUSES.map((s) => ({ value: s, label: p.statuses[s], count: loading ? undefined : statusCount(s) }))} />
              {hasFilters && (
                <button type="button" onClick={() => set({ q: undefined, type: undefined, province: undefined, status: undefined })} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-olive-700 hover:bg-olive-100">
                  <X aria-hidden className="h-3.5 w-3.5" />{p.clear}
                </button>
              )}
            </div>
          </GlassCard>

          {error ? (
            <GlassCard hover={false}><EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={reload}>{t.common.retry}</PillButton>} /></GlassCard>
          ) : loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass space-y-3 rounded-[22px] p-2"><Skel className="h-52 rounded-[18px]" /><Skel className="mx-3 h-5 w-2/3" /><Skel className="mx-3 mb-3 h-4 w-1/2" /></div>)}
            </div>
          ) : rows.length === 0 ? (
            <GlassCard hover={false}>
              <EmptyState icon={<SearchX className="h-6 w-6" />} title={p.noResults} body={p.noResultsBody}
                action={<PillButton variant="secondary" onClick={() => set({ q: undefined, type: undefined, province: undefined, status: undefined })}>{p.clear}</PillButton>} />
            </GlassCard>
          ) : (
            <Stagger className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3")} start={60} step={50}>
              {rows.map((x) => <PropertyCard key={x.id} p={x} canManage={canManage} onDelete={del.ask} />)}
            </Stagger>
          )}
        </>
      )}
      {del.dialog}
    </div>
  );
}
