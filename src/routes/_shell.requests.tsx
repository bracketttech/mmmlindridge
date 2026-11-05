import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarClock, Mail, Phone, Search, Star, Wrench } from "lucide-react";
import { PRIORITIES, REQ_CATEGORIES } from "@/mocks/maintenance";
import { contractorService, requestService, scheduleService, staffService, type MaintRequest } from "@/services";
import { EmptyState, GlassCard, PageHeader, PillButton, SegmentedChips, Skel, StatusChip, TruncatedText } from "@/components/nestly/primitives";
import { DataTable, NAvatar, type Column } from "@/components/nestly/composites";
import { ChartCard } from "@/components/nestly/charts";
import { SelectField } from "@/components/nestly/forms";
import { SidePanel } from "@/components/nestly/overlays";
import { Placeholder } from "@/components/nestly/Placeholder";
import { fill } from "@/components/nestly/properties/shared";
import { useMediaQuery, useUnitDirectory } from "@/components/nestly/tenants/shared";
import { CategoryChart, PriorityChip, ReqStatusChip } from "@/components/nestly/requests/shared";
import { RequestDetail } from "@/components/nestly/requests/RequestDetail";
import { TenantRequests } from "@/components/nestly/requests/TenantRequests";
import { useAppState } from "@/lib/app-state";
import { roleCanSee } from "@/lib/nav";
import { groupByStatus, isOpenStatus } from "@/lib/maintenance-rules";
import { useData } from "@/lib/use-data";
import { formatDate } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

const VIEWS = ["list", "board", "contractors", "schedule"] as const;
type View = (typeof VIEWS)[number];
type SearchP = { view?: View | undefined; id?: string | undefined };

export const Route = createFileRoute("/_shell/requests")({
  head: () => pageHead("Requests & maintenance", "Faults, upgrades, queries and move-out notices — tracked from logging to resolution."),
  validateSearch: (s: Record<string, unknown>): SearchP => ({
    view: VIEWS.includes(s["view"] as View) && s["view"] !== "list" ? (s["view"] as View) : undefined,
    id: typeof s["id"] === "string" && s["id"] ? s["id"] : undefined,
  }),
  component: RequestsPage,
});

const r = t.req;

function RequestsPage() {
  const { role } = useAppState();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/requests" });
  const set = (p: Partial<SearchP>, replace = true) => navigate({ search: (s: SearchP) => ({ ...s, ...p }), replace });
  if (!roleCanSee(role, "requests")) return <Placeholder navKey="requests" title={r.title} muted={r.muted} />;
  if (role === "tenant") return <TenantRequests selectedId={search.id} onSelect={(id) => set({ id }, !id)} />;
  return <OwnerRequests view={search.view ?? "list"} id={search.id} set={set} />;
}

function OwnerRequests({ view, id, set }: { view: View; id?: string | undefined; set: (p: Partial<SearchP>, replace?: boolean) => void }) {
  const { propertyId } = useAppState();
  const reqs = useData(() => requestService.list(propertyId), [propertyId]);
  const dir = useUnitDirectory();
  const wide = useMediaQuery("(min-width: 1280px)");
  const [q, setQ] = useState("");
  const [prop, setProp] = useState("all");
  const [prio, setPrio] = useState("all");
  const [cat, setCat] = useState("all");
  const [who, setWho] = useState("all");

  const all = reqs.data ?? [];
  const assignees = useMemo(() => [...new Map(all.filter((x) => x.assignee).map((x) => [x.assignee!.id, x.assignee!.name])).entries()], [all]);
  const rows = all.filter((x) =>
    (prop === "all" || x.propertyId === prop) && (prio === "all" || x.priority === prio) && (cat === "all" || x.category === cat) &&
    (who === "all" || (who === "none" ? !x.assignee : x.assignee?.id === who)) &&
    (!q.trim() || `${x.title} ${x.ref} ${x.tenantName}`.toLowerCase().includes(q.trim().toLowerCase())));
  const filtered = prop !== "all" || prio !== "all" || cat !== "all" || who !== "all" || !!q.trim();
  const clear = () => { setQ(""); setProp("all"); setPrio("all"); setCat("all"); setWho("all"); };
  const sel = all.find((x) => x.id === id) ?? null;
  const place = (x: MaintRequest) => dir.place(x);
  const openN = all.filter((x) => isOpenStatus(x.status)).length;
  const urgentN = all.filter((x) => isOpenStatus(x.status) && x.priority === "urgent").length;
  const showRail = view === "list" || view === "board";
  const detail = sel && <RequestDetail key={sel.id} req={sel} place={place(sel)} />;

  const columns: Column<MaintRequest>[] = [
    { key: "req", header: r.cols.request, render: (x) => <div className="min-w-0 max-w-[260px]"><TruncatedText text={x.title} className="font-medium text-ink-900" /><TruncatedText text={`${x.ref} · ${r.categoryShort[x.category]} · ${x.tenantName}`} className="text-[12px] text-ink-500" /></div> },
    { key: "place", header: r.cols.place, render: (x) => <TruncatedText text={place(x)} className="block max-w-[180px] text-ink-500" /> },
    { key: "prio", header: r.cols.priority, render: (x) => <PriorityChip p={x.priority} /> },
    { key: "status", header: r.cols.status, render: (x) => <ReqStatusChip s={x.status} /> },
    { key: "who", header: r.cols.assignee, render: (x) => <TruncatedText text={x.assignee?.name ?? r.filters.unassigned} className="block max-w-[160px] text-ink-500" /> },
    { key: "upd", header: r.cols.updated, render: (x) => <span className="whitespace-nowrap text-ink-500">{formatDate(x.updatedAt)}</span> },
  ];
  const card = (x: MaintRequest) => (
    <div className="min-w-0 space-y-2">
      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><TruncatedText text={x.title} className="font-medium text-ink-900" /><TruncatedText text={`${x.ref} · ${place(x)}`} className="block text-[12px] text-ink-500" /></div><ReqStatusChip s={x.status} /></div>
      <div className="flex flex-wrap items-center gap-2"><PriorityChip p={x.priority} /><StatusChip>{r.categoryShort[x.category]}</StatusChip><TruncatedText text={x.assignee?.name ?? r.filters.unassigned} className="min-w-0 flex-1 text-[12px] text-ink-500" /></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={r.title} muted={r.muted} sub={reqs.loading ? undefined : fill(r.sub, { open: openN, urgent: urgentN })} />
      <SegmentedChips label={r.title} value={view} onChange={(v) => set({ view: v === "list" ? undefined : v, id: v === "list" || v === "board" ? id : undefined })}
        options={VIEWS.map((v) => ({ value: v, label: r.views[v] }))} />

      {view === "contractors" ? <Contractors /> : view === "schedule" ? <Schedule /> : (
        <div className={cn("grid gap-4", wide && "xl:grid-cols-[minmax(0,1fr)_400px]")}>
          <div className="min-w-0 space-y-4">
            <GlassCard hover={false} className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5 md:p-4">
              <label className="relative sm:col-span-2 lg:col-span-1 lg:self-end">
                <span className="sr-only">{r.filters.search}</span>
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={r.filters.search} className="h-12 w-full rounded-[5.75px] border border-input bg-surface-solid pl-9 pr-3 text-[15px] outline-none focus:border-olive-700" />
              </label>
              <SelectField label={r.filters.property} value={prop} onChange={(e) => setProp(e.target.value)}><option value="all">{r.filters.all}</option>{dir.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectField>
              <SelectField label={r.filters.priority} value={prio} onChange={(e) => setPrio(e.target.value)}><option value="all">{r.filters.all}</option>{PRIORITIES.map((p) => <option key={p} value={p}>{r.priorities[p]}</option>)}</SelectField>
              <SelectField label={r.filters.category} value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">{r.filters.all}</option>{REQ_CATEGORIES.map((c) => <option key={c} value={c}>{r.categoryShort[c]}</option>)}</SelectField>
              <SelectField label={r.filters.assignee} value={who} onChange={(e) => setWho(e.target.value)}><option value="all">{r.filters.all}</option><option value="none">{r.filters.unassigned}</option>{assignees.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</SelectField>
            </GlassCard>

            {reqs.error ? <GlassCard hover={false} className="p-4"><EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={reqs.reload}>{t.common.retry}</PillButton>} /></GlassCard>
              : !reqs.loading && all.length === 0 ? <GlassCard hover={false} className="p-4"><EmptyState icon={<Wrench className="h-6 w-6" />} title={r.emptyTitle} body={r.emptyBody} /></GlassCard>
              : !reqs.loading && rows.length === 0 ? <GlassCard hover={false} className="p-4"><EmptyState icon={<Search className="h-6 w-6" />} title={r.zeroTitle} body={r.zeroBody} action={filtered ? <PillButton variant="secondary" onClick={clear}>{r.filters.clear}</PillButton> : undefined} /></GlassCard>
              : view === "list" ? (
                <DataTable rows={rows} columns={columns} loading={reqs.loading} caption={r.title} selectedId={id} onSelect={(i) => set({ id: i }, false)} card={card} />
              ) : (
                <Board rows={rows} loading={reqs.loading} selectedId={id} onSelect={(i) => set({ id: i }, false)} place={place} />
              )}

            <ChartCard title={r.chartTitle} sub={r.chartSub} state={reqs.loading ? "loading" : rows.length ? "ready" : "empty"}><CategoryChart items={rows} /></ChartCard>
          </div>
          {wide && showRail && (
            <GlassCard hover={false} className="min-w-0 self-start p-5 xl:sticky xl:top-4">{detail || <EmptyState icon={<Wrench className="h-6 w-6" />} body={r.selectOne} />}</GlassCard>
          )}
        </div>
      )}
      {!wide && showRail && <SidePanel open={!!sel} onOpenChange={(o) => !o && set({ id: undefined })} title={sel?.ref ?? ""} wide>{detail}</SidePanel>}
    </div>
  );
}

function Board({ rows, loading, selectedId, onSelect, place }: { rows: MaintRequest[]; loading: boolean; selectedId?: string | undefined; onSelect: (id: string) => void; place: (x: MaintRequest) => string }) {
  if (loading) return <div className="flex gap-3 overflow-hidden">{[0, 1, 2].map((i) => <Skel key={i} className="h-64 w-64 shrink-0" />)}</div>;
  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2" aria-label={r.views.board}>
      {groupByStatus(rows).map((col) => (
        <section key={col.status} className="glass w-[260px] shrink-0 snap-start space-y-2 rounded-[8.05px] p-2.5" aria-label={r.statuses[col.status]}>
          <header className="flex min-w-0 items-center justify-between gap-2 px-1"><ReqStatusChip s={col.status} /><span className="text-[12px] tabular-nums text-ink-500">{col.items.length}</span></header>
          {col.items.length === 0 ? <p className="rounded-[5.75px] border border-dashed border-border-soft p-3 text-center text-[12px] text-ink-500">—</p> : col.items.map((x) => (
            <button key={x.id} type="button" onClick={() => onSelect(x.id)} aria-current={x.id === selectedId ? "true" : undefined}
              className={cn("w-full min-w-0 space-y-1.5 rounded-[5.75px] border border-border-soft p-2.5 text-left shadow-soft transition", x.id === selectedId ? "bg-olive-100 ring-2 ring-olive-700" : "bg-surface-solid hover:bg-olive-100/50")}>
              <TruncatedText text={x.title} lines={2} className="text-[13px] font-medium text-ink-900" />
              <TruncatedText text={place(x)} className="block text-[11px] text-ink-500" />
              <div className="flex items-center justify-between gap-1"><PriorityChip p={x.priority} />{x.assignee && <NAvatar name={x.assignee.name} size={22} />}</div>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

function Contractors() {
  const cs = useData(() => contractorService.list(), []);
  if (cs.loading) return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skel key={i} className="h-40" />)}</div>;
  if (cs.error) return <EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={cs.reload}>{t.common.retry}</PillButton>} />;
  return (
    <div className="space-y-3">
      <h2 className="text-h3 text-ink-900">{r.contractors.title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(cs.data ?? []).map((c) => (
          <li key={c.id}><GlassCard className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <NAvatar name={c.name} size={44} />
              <div className="min-w-0 flex-1"><TruncatedText text={c.company} className="font-medium text-ink-900" /><TruncatedText text={`${c.name} · ${c.areas}`} className="block text-[12px] text-ink-500" /></div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[13px]"><StatusChip tone="info" className="min-w-0 max-w-full truncate">{c.trade}</StatusChip><span className="inline-flex items-center gap-1 text-ink-900"><Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden />{c.rating.toFixed(1).replace(".", ",")}</span><span className="text-ink-500">{fill(r.contractors.jobs, { n: c.jobs })}</span></div>
            <div className="flex gap-2">
              <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-olive-100 px-3 text-[13px] text-olive-900 hover:bg-olive-200"><Phone className="h-3.5 w-3.5" aria-hidden />{r.contractors.call}</a>
              <a href={`mailto:${c.email}`} className="inline-flex h-9 min-w-0 items-center gap-1.5 rounded-full bg-olive-100 px-3 text-[13px] text-olive-900 hover:bg-olive-200"><Mail className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="truncate">{r.contractors.email}</span></a>
            </div>
          </GlassCard></li>
        ))}
      </ul>
    </div>
  );
}

function Schedule() {
  const { propertyId } = useAppState();
  const s = useData(() => scheduleService.list(propertyId), [propertyId]);
  const dir = useUnitDirectory();
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  if (s.loading) return <div className="space-y-2">{[0, 1, 2].map((i) => <Skel key={i} className="h-20" />)}</div>;
  if (s.error) return <EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={s.reload}>{t.common.retry}</PillButton>} />;
  const items = s.data ?? [];
  return (
    <GlassCard hover={false} className="space-y-3 p-4 md:p-5">
      <div><h2 className="text-h3 text-ink-900">{r.schedule.title}</h2><p className="text-[13px] text-ink-500">{r.schedule.sub}</p></div>
      {items.length === 0 ? <EmptyState icon={<CalendarClock className="h-6 w-6" />} /> : (
        <ul className="space-y-2">
          {items.map((x) => {
            const d = new Date(x.nextDue);
            return (
              <li key={x.id} className="flex min-w-0 items-center gap-3 rounded-[5.75px] border border-border-soft bg-surface-solid/80 p-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[5.75px] bg-olive-700 text-center text-primary-foreground">
                  <div><div className="text-[18px] font-semibold leading-none">{d.getDate()}</div><div className="text-[11px] uppercase">{d.toLocaleDateString("en-ZA", { month: "short" })}</div></div>
                </div>
                <div className="min-w-0 flex-1">
                  <TruncatedText text={x.title} className="font-medium text-ink-900" />
                  <TruncatedText text={`${dir.propertyName(x.propertyId)} · ${x.assignee}`} className="block text-[12px] text-ink-500" />
                  <TruncatedText text={`${r.schedule.freq[x.frequency]} · ${fill(r.schedule.last, { date: formatDate(x.lastDone) })}`} className="text-[12px] text-ink-500" />
                </div>
                {x.nextDue < today ? <StatusChip tone="danger" dot className="shrink-0">{r.schedule.overdue}</StatusChip> : x.nextDue <= soon ? <StatusChip tone="warning" dot className="shrink-0">{r.schedule.dueSoon}</StatusChip> : null}
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
