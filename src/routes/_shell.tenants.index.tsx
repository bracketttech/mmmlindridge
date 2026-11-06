import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Search, SearchX, UserPlus, Users } from "lucide-react";
import { Placeholder } from "@/components/nestly/Placeholder";
import { EmptyState, GlassCard, PageHeader, PillButton, SegmentedChips, Stagger, TruncatedText } from "@/components/nestly/primitives";
import { DataTable, KpiTile, PersonCell, type Column } from "@/components/nestly/composites";
import { ConfirmDialog, SidePanel } from "@/components/nestly/overlays";
import { ProfileRail } from "@/components/nestly/tenants/ProfileRail";
import { SendLinkDialog } from "@/components/nestly/tenants/SendLinkDialog";
import { daysUntil, TenantStatus, useMediaQuery, useUnitDirectory } from "@/components/nestly/tenants/shared";
import { fill, useCanManage } from "@/components/nestly/properties/shared";
import { tenantService, type Tenant } from "@/services";
import { useAppState } from "@/lib/app-state";
import { roleCanSee } from "@/lib/nav";
import { useData } from "@/lib/use-data";
import { formatDate, formatZAR } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";

const STATUSES = ["all", "active", "arrears", "notice", "pending", "archived"] as const;
type Status = (typeof STATUSES)[number];
type Search = { q?: string | undefined; status?: Exclude<Status, "all"> | undefined; t?: string | undefined };

export const Route = createFileRoute("/_shell/tenants/")({
  head: () => pageHead("Tenants", "Every tenant with their unit, lease, balance and profile."),
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s["q"] === "string" && s["q"] ? s["q"] : undefined,
    status: STATUSES.includes(s["status"] as Status) && s["status"] !== "all" ? (s["status"] as Exclude<Status, "all">) : undefined,
    t: typeof s["t"] === "string" && s["t"] ? s["t"] : undefined,
  }),
  component: TenantsPage,
});

const surname = (n: string) => n.split(" ").slice(-1)[0] ?? n;

function TenantsPage() {
  const { role, propertyId } = useAppState();
  const canManage = useCanManage("tenants");
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/tenants/" });
  const tt = t.tenants;
  const { data, loading, error, reload } = useData(() => tenantService.list(propertyId, { archived: true }), [propertyId]);
  const dir = useUnitDirectory();
  const wide = useMediaQuery("(min-width: 1536px)");
  const [linkFor, setLinkFor] = useState<Tenant | null>(null);
  const [archiveFor, setArchiveFor] = useState<Tenant | null>(null);
  const [deleteFor, setDeleteFor] = useState<Tenant | null>(null);

  const all = data ?? [];
  const live = all.filter((x) => !x.archived);
  const set = (patch: Partial<Search>, replace = true) => navigate({ search: (s: Search) => ({ ...s, ...patch }), replace });
  const rows = useMemo(() => {
    const q = search.q?.trim().toLowerCase() ?? "";
    return all
      .filter((x) => (search.status === "archived" ? x.archived : !x.archived && (!search.status || x.status === search.status)))
      .filter((x) => !q || [x.name, x.email, x.phone, dir.unitLabel(x.unitId), dir.propertyName(x.propertyId)].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => surname(a.name).localeCompare(surname(b.name), "en-ZA"));
  }, [all, search.q, search.status, dir]);
  const selected = all.find((x) => x.id === search.t) ?? null;

  if (!roleCanSee(role, "tenants")) return <Placeholder navKey="tenants" title={tt.title} muted={tt.muted} />;

  const count = (s: Status) => (s === "all" ? live.length : s === "archived" ? all.length - live.length : live.filter((x) => x.status === s).length);
  const arrears = live.filter((x) => x.balance > 0);
  const ending = live.filter((x) => x.leaseEnd && daysUntil(x.leaseEnd) >= 0 && daysUntil(x.leaseEnd) <= 60);
  const pending = live.filter((x) => !x.registered);
  const owing = arrears.reduce((a, x) => a + x.balance, 0);

  const cols: Column<Tenant>[] = [
    { key: "tenant", header: tt.cols.tenant, render: (x) => <div className="max-w-[240px]"><PersonCell name={x.name} email={x.email} src={x.avatar} /></div> },
    { key: "unit", header: tt.cols.unit, render: (x) => <div className="min-w-0 max-w-[160px]"><p className="font-medium text-ink-900">{dir.unitLabel(x.unitId)}</p><TruncatedText text={dir.propertyName(x.propertyId)} className="text-[12px] text-ink-500" /></div> },
    { key: "lease", header: tt.cols.leaseEnd, render: (x) => <span className="text-ink-700">{x.leaseEnd ? formatDate(x.leaseEnd) : "—"}</span> },
    { key: "balance", header: tt.cols.balance, render: (x) => <span className={x.balance ? "font-medium tabular-nums text-danger" : "tabular-nums text-ink-500"}>{x.balance ? formatZAR(x.balance) : tt.upToDate}</span> },
    { key: "status", header: tt.cols.status, render: (x) => <TenantStatus x={x} /> },
  ];
  const card = (x: Tenant) => (
    <button type="button" onClick={() => set({ t: x.id }, false)} className="flex w-full min-w-0 items-center justify-between gap-3 text-left">
      <div className="min-w-0 flex-1"><PersonCell name={x.name} email={x.email} src={x.avatar} /></div>
      <div className="shrink-0 text-right"><TenantStatus x={x} /><p className="mt-1 text-[12px] text-ink-500">{dir.unitLabel(x.unitId)} · {x.balance ? formatZAR(x.balance) : tt.upToDate}</p></div>
    </button>
  );
  const addBtn = canManage && <PillButton icon={<UserPlus className="h-4 w-4" />} onClick={() => navigate({ to: "/tenants/new" })}>{tt.add}</PillButton>;

  const rail = selected && (
    <ProfileRail x={selected} place={dir.place(selected)} canManage={canManage} onClose={() => set({ t: undefined })}
      onSendLink={() => setLinkFor(selected)} onArchive={() => setArchiveFor(selected)} onDelete={() => setDeleteFor(selected)} />
  );

  return (
    <div className="space-y-6">
      <PageHeader title={tt.title} muted={tt.muted} sub={loading ? undefined : fill(tt.sub, { n: live.filter((x) => x.registered).length, p: pending.length })} actions={addBtn} />

      {!loading && !error && all.length === 0 ? (
        <GlassCard hover={false}><EmptyState icon={<Users className="h-6 w-6" />} title={tt.emptyTitle} body={tt.emptyBody} action={addBtn || undefined} /></GlassCard>
      ) : (
        <>
          <Stagger className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <KpiTile loading={loading} label={tt.kpi.active} value={String(live.length)} unit={tt.kpi.people} variant="donut" percent={live.length ? Math.round(((live.length - arrears.length) / live.length) * 100) : 0} tip={`${live.length - arrears.length} / ${live.length} ${tt.upToDate.toLowerCase()}`} />
            <KpiTile loading={loading} label={tt.kpi.arrears} value={String(arrears.length)} unit={tt.kpi.owing} variant="tick-bar" visual={arrears.map((x) => x.balance)} tip={formatZAR(owing)} />
            <KpiTile loading={loading} label={tt.kpi.leases} value={String(ending.length)} unit={tt.kpi.in60} variant="plain" />
            <KpiTile loading={loading} label={tt.kpi.pending} value={String(pending.length)} unit={tt.kpi.invited} variant="plain" />
          </Stagger>

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <GlassCard hover={false} className="min-w-0 space-y-3 p-3 md:p-4">
              <div className="flex flex-col gap-3 px-1 lg:flex-row lg:items-center lg:justify-between">
                <div><h2 className="text-h3 text-ink-900">{tt.all}</h2><p className="text-[12px] text-ink-500">{tt.sortedBy}</p></div>
                <label className="relative flex min-w-0 items-center lg:w-72">
                  <span className="sr-only">{tt.search}</span>
                  <Search aria-hidden className="pointer-events-none absolute left-3.5 h-4 w-4 text-ink-500" />
                  <input type="search" value={search.q ?? ""} onChange={(e) => set({ q: e.target.value || undefined })} placeholder={tt.search}
                    className="h-10 w-full rounded-full border border-border-soft bg-surface-solid pl-10 pr-3 text-[14px] outline-none focus:border-olive-700 focus:ring-3 focus:ring-olive-200" />
                </label>
              </div>
              <SegmentedChips label={tt.cols.status} value={search.status ?? "all"} onChange={(v) => set({ status: v === "all" ? undefined : v })} wrap
                options={STATUSES.map((s) => ({ value: s, label: tt.statuses[s], count: loading ? undefined : count(s) }))} />
              <DataTable rows={rows} columns={cols} loading={loading} error={error} onRetry={reload} caption={tt.all} card={card}
                selectedId={search.t} onSelect={(id) => set({ t: id }, false)}
                empty={<EmptyState icon={<SearchX className="h-6 w-6" />} title={tt.noResults} body={tt.noResultsBody} action={<PillButton variant="secondary" onClick={() => set({ q: undefined, status: undefined })}>{t.props.clear}</PillButton>} />} />
            </GlassCard>
            {wide && (
              <GlassCard hover={false} className="sticky top-4 hidden max-h-[calc(100vh-2rem)] self-start overflow-y-auto p-5 2xl:block">
                {rail || <EmptyState icon={<Users className="h-6 w-6" />} body={tt.rail.empty} />}
              </GlassCard>
            )}
          </div>
        </>
      )}

      {!wide && <SidePanel open={!!selected} onOpenChange={(o) => !o && set({ t: undefined })} title={selected?.name ?? ""}>{rail}</SidePanel>}
      {linkFor && <SendLinkDialog tenant={linkFor} place={{ property: dir.propertyName(linkFor.propertyId), unit: dir.unitLabel(linkFor.unitId) }} onClose={() => setLinkFor(null)} />}
      <ConfirmDialog open={!!archiveFor} onOpenChange={(o) => !o && setArchiveFor(null)}
        title={archiveFor?.archived ? tt.rail.restore : fill(tt.archiveTitle, { name: archiveFor?.name ?? "" })} body={archiveFor?.archived ? "" : tt.archiveBody}
        confirmLabel={archiveFor?.archived ? tt.rail.restore : tt.rail.archive} tone="primary"
        onConfirm={async () => { if (!archiveFor) return; await tenantService.archive(archiveFor.id, !archiveFor.archived); toast.success(archiveFor.archived ? tt.restored : tt.archived); }} />
      <ConfirmDialog open={!!deleteFor} onOpenChange={(o) => !o && setDeleteFor(null)} title={fill(tt.deleteTitle, { name: deleteFor?.name ?? "" })} body={tt.deleteBody} confirmLabel={tt.rail.delete}
        onConfirm={async () => { if (!deleteFor) return; await tenantService.remove(deleteFor.id); toast.success(tt.deleted); set({ t: undefined }); }} />
    </div>
  );
}
