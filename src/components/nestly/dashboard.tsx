import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Home, Users, Wallet, AlertTriangle, Info, CheckCircle2, XCircle, CalendarClock, ArrowUpRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DashboardData } from "@/services";
import { formatCompactZAR, formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { CardMenu, GlassCard, Skel, TruncatedText, Stagger, StatusChip, EmptyState } from "./primitives";
import { KpiTile, StatusCell } from "./composites";
import { AreaComparisonChart, ChartCard, GaugeChart } from "./charts";
import { propertyImage } from "@/images";
import { FadeImage } from "./fade-image";
import type { Role } from "@/lib/nav";

const d = t.dash;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));

/* ---------- Featured property (glass overlay) ---------- */
export function FeaturedProperty({ data }: { data: DashboardData }) {
  const p = data.featured;
  const all = data.propertyId === "all";
  return (
    <article className="lift relative h-[320px] overflow-hidden rounded-[8.05px] bg-olive-200 shadow-soft lg:h-full lg:min-h-[340px]">
      {propertyImage(p.id) && <FadeImage src={propertyImage(p.id)!} alt={p.name} width={1024} height={768} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-linear-to-t from-olive-900/50 via-transparent to-transparent" />
      <span className="glass absolute left-3 top-3 inline-flex h-7 items-center gap-1.5 rounded-full border-surface-solid/40 bg-surface-solid/25 px-3 text-[12px] font-medium text-on-dark shadow-none">
        <Home className="h-3.5 w-3.5" aria-hidden />{all ? fill(d.allProps, { n: data.properties.length }) : d.featured}
      </span>
      <div className="glass absolute inset-x-3 bottom-3 rounded-[5.75px] border-surface-solid/40 bg-surface-solid/20 p-4 text-on-dark shadow-none">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <TruncatedText text={p.name} className="text-h3" />
            <p className="flex min-w-0 items-center gap-1 text-[12px] text-on-dark-muted"><MapPin aria-hidden className="h-3 w-3 shrink-0" /><TruncatedText text={`${p.address}, ${p.suburb}`} /></p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-overline text-on-dark-muted">{d.rentRoll}</p>
            <p className="text-[20px] tabular-nums">{formatCompactZAR(data.rent.due)}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
          {[`${fill(d.units, { n: data.totals.units })}`, fill(d.occupied, { n: data.totals.occupancy }), `${data.counts.openRequests} ${d.openRequests.toLowerCase()}`].map((c) => (
            <span key={c} className="rounded-full border border-surface-solid/40 px-2.5 py-1">{c}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

/* ---------- Arrears ageing ---------- */
export function AgeingCard({ data }: { data: DashboardData }) {
  const total = data.arrears.total || 1;
  return (
    <GlassCard className="flex h-full flex-col">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0"><h3 className="truncate text-h3">{d.ageingTitle}</h3><p className="truncate text-[12px] text-ink-500">{d.ageingSub}</p></div>
        <CardMenu />
      </div>
      <div className="flex flex-1 items-center justify-center py-2">
        <GaugeChart value={data.arrears.currentPct} label={d.ageingGaugeLabel} detail={`${formatZAR(data.arrears.ageing[0])} of ${formatZAR(data.arrears.total)} is under 30 days`} />
      </div>
      <div className="grid grid-cols-4 gap-1 border-t border-border-soft pt-3">
        {data.arrears.ageing.map((v, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <button type="button" className="min-w-0 rounded-[3.45px] p-1 text-center hover:bg-olive-100">
                <span className="block text-[16px] tabular-nums text-ink-900">{Math.round((v / total) * 100)}%</span>
                <span className="block truncate text-[11px] text-ink-500">{d.buckets[i]}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>{d.buckets[i]}: {formatZAR(v)}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </GlassCard>
  );
}

/* ---------- Lists ---------- */
const toneIcon = { danger: XCircle, warning: AlertTriangle, info: Info, success: CheckCircle2 };
const toneCls = { danger: "bg-danger/12 text-danger", warning: "bg-warning/15 text-warning-ink", info: "bg-info/12 text-info", success: "bg-olive-200 text-olive-900" };

function ListCard({ title, sub, children, action }: { title: string; sub?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <GlassCard className="flex h-full min-w-0 flex-col">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0"><h3 className="truncate text-h3">{title}</h3>{sub && <p className="truncate text-[12px] text-ink-500">{sub}</p>}</div>
        {action ?? <CardMenu />}
      </div>
      {children}
    </GlassCard>
  );
}

export function AttentionList({ data }: { data: DashboardData }) {
  return (
    <ListCard title={d.attention} sub={d.attentionSub}>
      {data.attention.length === 0 ? <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} body={d.none} /> : (
        <ul className="space-y-1">
          {data.attention.map((a) => {
            const Icon = toneIcon[a.tone];
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-[4.6px] p-2 hover:bg-surface-solid/70">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", toneCls[a.tone])}><Icon aria-hidden className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <TruncatedText text={a.title} className="text-[14px] font-medium text-ink-900" />
                  <TruncatedText text={a.meta} className="text-[12px] text-ink-500" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ListCard>
  );
}

export function ActivityFeed({ data }: { data: DashboardData }) {
  return (
    <ListCard title={d.activity} sub={d.activitySub}>
      {data.activity.length === 0 ? <EmptyState body={d.none} /> : (
        <ol className="relative space-y-3 pl-6">
          <span aria-hidden className="absolute bottom-1 left-[7px] top-1 w-px bg-border-soft" />
          {data.activity.map((e, i) => (
            <li key={e.id} className="relative min-w-0">
              <span aria-hidden className={cn("absolute -left-6 top-1 h-[15px] w-[15px] rounded-full border-[3px] border-surface-solid", i === 0 ? "bg-olive-700" : "bg-olive-200")} />
              <TruncatedText text={e.title} className="text-[14px] font-medium text-ink-900" />
              <TruncatedText text={e.meta} className="text-[12px] text-ink-500" />
            </li>
          ))}
        </ol>
      )}
    </ListCard>
  );
}

export function ExpiryList({ data }: { data: DashboardData }) {
  return (
    <ListCard title={d.expiriesTitle} sub={`${data.expiries.length} ${d.next90}`}>
      {data.expiries.length === 0 ? <EmptyState body={d.none} /> : (
        <ul className="space-y-1">
          {data.expiries.map((x) => (
            <li key={x.id} className="flex items-center gap-3 rounded-[4.6px] p-2 hover:bg-surface-solid/70">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-olive-200 text-olive-900"><CalendarClock aria-hidden className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <TruncatedText text={x.tenant} className="text-[14px] font-medium text-ink-900" />
                <TruncatedText text={`${x.unit} · ${x.property}`} className="text-[12px] text-ink-500" />
              </div>
              <span className="shrink-0 text-[12px] tabular-nums text-ink-500">{formatDate(x.endsOn)}</span>
            </li>
          ))}
        </ul>
      )}
    </ListCard>
  );
}

function RequestsList({ data }: { data: DashboardData }) {
  const open = data.requests.filter((r) => r.status !== "resolved");
  return (
    <ListCard title={d.requestsTitle} sub={`${open.length} ${d.open}`} action={<Link to="/requests" aria-label={d.requestsTitle} className="grid h-8 w-8 place-items-center rounded-full bg-olive-700 text-primary-foreground"><ArrowUpRight className="h-4 w-4" /></Link>}>
      {open.length === 0 ? <EmptyState body={d.none} /> : (
        <ul className="space-y-1">
          {open.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-[4.6px] p-2 hover:bg-surface-solid/70">
              <div className="min-w-0 flex-1">
                <TruncatedText text={r.title} className="text-[14px] font-medium text-ink-900" />
                <p className="text-[12px] text-ink-500">{formatDate(r.createdAt)} · {r.priority} priority</p>
              </div>
              <StatusCell status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </ListCard>
  );
}

function OverdueList({ data }: { data: DashboardData }) {
  return (
    <ListCard title={d.overdueTitle} sub={formatZAR(data.overdue.reduce((s, i) => s + i.amount, 0))}>
      {data.overdue.length === 0 ? <EmptyState body={d.none} /> : (
        <ul className="space-y-1">
          {data.overdue.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-[4.6px] p-2 hover:bg-surface-solid/70">
              <div className="min-w-0 flex-1"><p className="text-[14px] font-medium">{i.id}</p><p className="text-[12px] text-ink-500">Due {formatDate(i.dueDate)}</p></div>
              <span className="shrink-0 text-[14px] tabular-nums">{formatZAR(i.amount)}</span>
              <StatusCell status={i.status} />
            </li>
          ))}
        </ul>
      )}
    </ListCard>
  );
}

function VacantList({ data }: { data: DashboardData }) {
  return (
    <ListCard title={d.vacantTitle} sub={`${data.vacantUnits.length} units`}>
      {data.vacantUnits.length === 0 ? <EmptyState body={d.none} /> : (
        <ul className="space-y-1">
          {data.vacantUnits.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-[4.6px] p-2 hover:bg-surface-solid/70">
              <div className="min-w-0 flex-1"><p className="text-[14px] font-medium">{u.label}</p><p className="text-[12px] text-ink-500">{u.beds} bed · {formatZAR(u.rent)} / month</p></div>
              <StatusCell status={u.status} />
            </li>
          ))}
        </ul>
      )}
    </ListCard>
  );
}

/* ---------- KPI sets ---------- */
function useKpis(data: DashboardData) {
  const sparkTip = `${data.series.at(-1)!.month}: ${formatZAR(data.rent.collected)} collected`;
  return {
    rent: <KpiTile label={d.rentCollected} value={formatCompactZAR(data.rent.collected)} unit={fill(d.ofDue, { due: formatCompactZAR(data.rent.due) })} variant="sparkline" visual={data.ticks} tip={sparkTip} delta={`${data.rent.deltaPct > 0 ? "+" : ""}${String(data.rent.deltaPct).replace(".", ",")}%`} deltaLabel={d.vsLast} />,
    arrears: <KpiTile label={d.arrears} value={formatCompactZAR(data.arrears.total)} unit={fill(d.tenantsOwing, { n: data.overdue.length })} variant="tick-bar" visual={data.arrears.ageing.map((x) => x + 500)} tip={`Total arrears ${formatZAR(data.arrears.total)}`} delta={`${data.arrears.currentPct}%`} deltaLabel="under 30 days" />,
    occupancy: <KpiTile label={d.occupancy} value={`${data.totals.occupancy}%`} unit={fill(d.unitsOcc, { n: data.totals.units })} variant="donut" percent={data.totals.occupancy} tip={`${data.totals.occupied} of ${data.totals.units} units occupied`} delta={`${data.counts.vacant}`} deltaLabel="vacant" />,
    requests: <KpiTile label={d.openRequests} value={String(data.counts.openRequests)} unit="open" variant="tick-bar" visual={[2, 3, 1, 4, 3, 5, 2, data.counts.openRequests]} tip={fill(d.highPriority, { n: data.counts.highPriority })} delta={String(data.counts.highPriority)} deltaLabel="high priority" />,
    expiries: <KpiTile label={d.expiries} value={String(data.counts.expiring)} unit="leases" delta={`${data.expiries.length}`} deltaLabel={d.next90} />,
    collection: <KpiTile label={d.collectionRate} value={`${data.rent.rate}%`} unit={d.thisMonth} variant="donut" percent={data.rent.rate} tip={`${formatZAR(data.rent.collected)} of ${formatZAR(data.rent.due)}`} />,
    unpaid: <KpiTile label={d.overdueTitle} value={String(data.overdue.length)} unit="invoices" delta={formatCompactZAR(data.overdue.reduce((s, i) => s + i.amount, 0))} deltaLabel="outstanding" />,
    jobs: <KpiTile label={d.jobsToday} value={String(data.counts.jobsToday)} unit={d.scheduled} variant="tick-bar" visual={[1, 2, 3, 2, 4, 1, data.counts.jobsToday + 1]} tip={`${data.counts.jobsToday} visits scheduled today`} />,
    high: <KpiTile label="High priority" value={String(data.counts.highPriority)} unit="requests" />,
    vacant: <KpiTile label={d.vacant} value={String(data.counts.vacant)} unit={d.ready} variant="donut" percent={100 - data.totals.occupancy} tip={`${data.counts.vacant} units vacant or on notice`} />,
    applications: <KpiTile label={d.applications} value={String(data.counts.applications)} unit={d.toReview} variant="tick-bar" visual={[1, 2, 2, 3, 4, data.counts.applications]} tip={`${data.counts.applications} applications waiting`} />,
    viewings: <KpiTile label={d.viewings} value={String(data.counts.viewings)} unit={d.thisWeek} />,
    notices: <KpiTile label={d.notices} value={String(data.counts.notices)} unit={d.served} />,
    breaches: <KpiTile label={d.breaches} value={String(data.counts.breaches)} unit={d.open} />,
  };
}

const RentChart = ({ data }: { data: DashboardData }) => (
  <ChartCard title={d.chartTitle} sub={d.chartSub}>
    <AreaComparisonChart data={data.series} names={{ collected: d.collected, previous: d.due }} />
  </ChartCard>
);

/* ---------- Role layouts ---------- */
export function DashboardBody({ role, data }: { role: Exclude<Role, "tenant">; data: DashboardData }) {
  const k = useKpis(data);
  if (role === "owner")
    return (
      <div className="space-y-4">
        <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-12" step={60}>
          {[
            <div key="f" className="h-full lg:col-span-4"><FeaturedProperty data={data} /></div>,
            <div key="k" className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-5">{k.rent}{k.arrears}{k.occupancy}{k.requests}</div>,
            <div key="g" className="h-full lg:col-span-3"><AgeingCard data={data} /></div>,
          ].map((el) => el)}
        </Stagger>
        <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-12" start={300}>
          <div className="lg:col-span-8"><RentChart data={data} /></div>
          <div className="h-full lg:col-span-4"><AttentionList data={data} /></div>
        </Stagger>
        <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-12" start={420}>
          <div className="h-full lg:col-span-4"><ActivityFeed data={data} /></div>
          <div className="h-full lg:col-span-3">{k.expiries}</div>
          <div className="h-full lg:col-span-5"><ExpiryList data={data} /></div>
        </Stagger>
      </div>
    );
  if (role === "finance")
    return (
      <div className="space-y-4">
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{k.rent}{k.collection}{k.arrears}{k.unpaid}</Stagger>
        <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-12" start={300}>
          <div className="lg:col-span-8"><RentChart data={data} /></div>
          <div className="h-full lg:col-span-4"><AgeingCard data={data} /></div>
        </Stagger>
        <Stagger className="grid grid-cols-1 gap-4" start={420}><OverdueList data={data} /></Stagger>
      </div>
    );
  if (role === "caretaker")
    return (
      <div className="space-y-4">
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3">{k.jobs}{k.requests}{k.high}</Stagger>
        <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-2" start={300}><RequestsList data={data} /><AttentionList data={data} /></Stagger>
      </div>
    );
  if (role === "agent")
    return (
      <div className="space-y-4">
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{k.vacant}{k.applications}{k.viewings}{k.expiries}</Stagger>
        <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-12" start={300}>
          <div className="h-full lg:col-span-4"><FeaturedProperty data={data} /></div>
          <div className="h-full lg:col-span-4"><VacantList data={data} /></div>
          <div className="h-full lg:col-span-4"><ExpiryList data={data} /></div>
        </Stagger>
      </div>
    );
  return (
    <div className="space-y-4">
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3">{k.notices}{k.breaches}{k.expiries}</Stagger>
      <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-2" start={300}><ExpiryList data={data} /><AttentionList data={data} /></Stagger>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skel className="h-[320px] rounded-[8.05px] lg:col-span-4" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-5">{[0, 1, 2, 3].map((i) => <KpiTile key={i} label="" value="" loading />)}</div>
        <Skel className="h-[320px] rounded-[8.05px] lg:col-span-3" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skel className="h-72 rounded-[8.05px] lg:col-span-8" />
        <Skel className="h-72 rounded-[8.05px] lg:col-span-4" />
      </div>
    </div>
  );
}

export { Users, Wallet };
