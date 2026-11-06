import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { billingService, propertyService, reportsService, type RentRollRow } from "@/services";
import { DataTable, KpiTile, type Column } from "@/components/nestly/composites";
import { AreaComparisonChart, ChartCard, GaugeChart, TickBarChart } from "@/components/nestly/charts";
import { GlassCard, PageHeader, PillButton, SegmentedChips, TruncatedText } from "@/components/nestly/primitives";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TextField } from "@/components/nestly/auth";
import { FadeImage } from "@/components/nestly/fade-image";
import { fill, resolvePhoto } from "@/components/nestly/properties/shared";
import { AgeingChart, downloadCsv } from "@/components/nestly/billing/shared";
import { RANGES, inRange, rangeBounds, sumByMonth, turnoverPct, type Range } from "@/lib/reports-rules";
import { useAppState } from "@/lib/app-state";
import { useAccess } from "@/lib/access";
import { useData } from "@/lib/use-data";
import { formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";

const r = t.rep;
const todayIso = () => new Date().toISOString().slice(0, 10);
const label = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-ZA", { month: "short", year: "numeric" });

export function ReportsPage() {
  const { propertyId, setPropertyId, scope } = useAppState();
  const { can } = useAccess();
  const canExport = can("reports", "export");
  const [range, setRange] = useState<Range>("12m");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const props = useData(() => propertyService.list(), []);
  const hist = useData(() => reportsService.history(propertyId), [propertyId]);
  const roll = useData(() => reportsService.rentRoll(propertyId), [propertyId]);
  const vac = useData(() => reportsService.vacancies(propertyId), [propertyId]);
  const arr = useData(() => billingService.arrears(propertyId), [propertyId]);
  const b = rangeBounds(range, todayIso(), custom);
  const rows = useMemo(() => inRange(hist.data ?? [], b), [hist.data, b.from, b.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthly = sumByMonth(rows, ["income", "expenses", "maintenance", "moveIns", "moveOuts"]);
  const st = (loading: boolean, error: boolean, empty: boolean) => (loading ? "loading" : error ? "error" : empty ? "empty" : "ready") as "loading" | "error" | "empty" | "ready";
  const ps = props.data ?? [];
  const inView = ps.filter((p) => propertyId === "all" || p.id === propertyId);
  const units = inView.reduce((a, p) => a + p.units, 0), occ = inView.reduce((a, p) => a + p.occupied, 0);
  const rentRoll = (roll.data ?? []).reduce((a, x) => a + x.rent, 0);
  const income = monthly.reduce((a, m) => a + m.income, 0);
  const avgVac = vac.data?.length ? Math.round(vac.data.reduce((a, v) => a + v.days, 0) / vac.data.length) : 0;
  const turnover = turnoverPct(monthly.reduce((a, m) => a + m.moveOuts, 0), occ);
  const maintByProp = ps.map((p) => ({ id: p.id, name: p.name, v: rows.filter((x) => x.propertyId === p.id).reduce((a, x) => a + x.maintenance, 0) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const maxM = Math.max(1, ...maintByProp.map((x) => x.v));
  const top = [...inView].sort((a, b) => b.rentRoll - a.rentRoll)[0];
  const exp = (name: string, data: (string | number)[][]) => { downloadCsv(`${name}.csv`, data); toast.success(fill(r.exported, { name })); };
  const ExportBtn = ({ onClick }: { onClick: () => void }) => (canExport ? <button type="button" aria-label={r.export} onClick={onClick} className="grid h-8 w-8 place-items-center rounded-full text-ink-500 hover:bg-olive-100"><Download className="h-4 w-4" /></button> : <span />);
  const loading = hist.loading;
  const cols: Column<RentRollRow>[] = [
    { key: "p", header: r.cols.place, render: (x) => <div className="max-w-[200px]"><TruncatedText text={x.place} /></div> },
    { key: "u", header: r.cols.unit, render: (x) => x.unit },
    { key: "t", header: r.cols.tenant, render: (x) => <div className="max-w-[200px]"><TruncatedText text={x.tenantName} /></div> },
    { key: "r", header: r.cols.rent, render: (x) => formatZAR(x.rent) },
    { key: "e", header: r.cols.end, render: (x) => (x.leaseEnd ? formatDate(x.leaseEnd) : "—") },
    { key: "b", header: r.cols.balance, render: (x) => <span className={x.balance > 0 ? "text-danger" : ""}>{formatZAR(x.balance)}</span> },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title={r.title} muted={r.muted} sub={fill(r.sub, { range: range === "custom" ? `${label(b.from)} – ${label(b.to)}` : r.ranges[range], scope: propertyId === "all" ? r.allProps : top?.name ?? "" })}
        actions={<>
          <SegmentedChips label={r.cols.place} value={propertyId} onChange={setPropertyId} options={[...(scope === "all" ? [{ value: "all", label: r.allProps }] : []), ...ps.map((p) => ({ value: p.id, label: p.name.length > 18 ? `${p.name.slice(0, 16)}…` : p.name }))]} />
          <label className="sr-only" htmlFor="rep-range">{r.ranges["12m"]}</label>
          <select id="rep-range" value={range} onChange={(e) => setRange(e.target.value as Range)} className="glass h-10 rounded-full px-4 text-[13px] font-medium shadow-none">{RANGES.map((x) => <option key={x} value={x}>{r.ranges[x]}</option>)}</select>
        </>} />
      {range === "custom" && <div className="flex flex-wrap gap-3"><TextField label={r.from} type="month" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /><TextField label={r.to} type="month" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></div>}
      <div className="grid gap-4 lg:grid-cols-12">
        <GlassCard className="relative min-h-[260px] overflow-hidden p-0 lg:col-span-4">
          {top && <FadeImage src={resolvePhoto(top.photos[0])} alt={top.name} className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-x-3 bottom-3 rounded-[5.75px] bg-olive-900/70 p-4 text-primary-foreground backdrop-blur">
            <p className="text-overline opacity-80">{r.spotlight}</p>
            <TruncatedText text={top?.name ?? "—"} className="text-h3" />
            <p className="text-[13px] opacity-80">{top ? `${formatZAR(top.rentRoll)} ${r.kpi.perMonth} · ${fill(r.occDetail, { o: top.occupied, u: top.units })}` : ""}</p>
          </div>
        </GlassCard>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-5">
          <KpiTile loading={roll.loading} label={r.kpi.rentRoll} value={formatZAR(rentRoll, { decimals: false })} unit={r.kpi.perMonth} />
          <KpiTile loading={loading} label={r.kpi.collected} value={formatZAR(income, { decimals: false })} variant="sparkline" visual={monthly.length > 1 ? monthly.map((m) => m.income) : [0, 0]} tip={`${r.kpi.collected}: ${formatZAR(income)}`} />
          <KpiTile loading={vac.loading} label={r.kpi.vacancy} value={String(avgVac)} unit={r.kpi.days} />
          <KpiTile loading={loading} label={r.kpi.turnover} value={`${String(turnover).replace(".", ",")}%`} unit={r.kpi.ofLet} variant="tick-bar" visual={monthly.length ? monthly.map((m) => m.moveOuts + 1) : [1]} tip={`${r.moveOuts}: ${monthly.reduce((a, m) => a + m.moveOuts, 0)}`} />
        </div>
        <ChartCard title={r.occupancy} state={st(props.loading, props.error, !units)} action={<span />}>
          <GaugeChart value={units ? Math.round((occ / units) * 100) : 0} label={r.occupancy} detail={fill(r.occDetail, { o: occ, u: units })} />
        </ChartCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4"><ChartCard title={r.maint} sub={r.maintSub} state={st(loading, hist.error, !maintByProp.length)} action={<ExportBtn onClick={() => exp(r.maint, [[r.cols.place, "R"], ...maintByProp.map((x) => [x.name, x.v])])} />}>
          <ul className="space-y-3">{maintByProp.map((x) => (
            <li key={x.id}><Tooltip><TooltipTrigger asChild><button type="button" className="block w-full text-left"><span className="flex justify-between gap-2 text-[13px]"><TruncatedText text={x.name} /><span className="shrink-0 tabular-nums">{formatZAR(x.v, { decimals: false })}</span></span>
              <span className="mt-1 block h-2 overflow-hidden rounded-full bg-olive-100"><span className="block h-full rounded-full bg-[repeating-linear-gradient(135deg,var(--olive-700)_0_4px,var(--olive-500)_4px_8px)]" style={{ width: `${(x.v / maxM) * 100}%` }} /></span></button></TooltipTrigger>
              <TooltipContent>{x.name}: {formatZAR(x.v)}</TooltipContent></Tooltip></li>))}</ul>
        </ChartCard></div>
        <div className="lg:col-span-5"><ChartCard title={r.income} sub={r.incomeSub} state={st(loading, hist.error, !monthly.length)} action={<ExportBtn onClick={() => exp(r.income, [["Month", "Income", "Expenses"], ...monthly.map((m) => [m.month, m.income, m.expenses])])} />}>
          <AreaComparisonChart data={monthly.map((m) => ({ month: label(m.month), collected: m.income, previous: m.expenses }))} names={{ collected: "Income", previous: "Expenses" }} />
        </ChartCard></div>
        <div className="lg:col-span-3"><ChartCard title={r.turnoverTitle} sub={r.turnoverSub} state={st(loading, hist.error, !monthly.length)} action={<ExportBtn onClick={() => exp(r.turnoverTitle, [["Month", r.moveIns, r.moveOuts], ...monthly.map((m) => [m.month, m.moveIns, m.moveOuts])])} />}>
          <TickBarChart data={monthly.map((m) => ({ label: label(m.month), value: m.moveIns + m.moveOuts }))} name={`${r.moveIns} + ${r.moveOuts}`} format={(v) => String(v)} />
        </ChartCard></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={r.arrears} sub={r.arrearsSub} state={st(arr.loading, arr.error, !arr.data?.total)} action={<ExportBtn onClick={() => exp(r.arrears, [["Bucket", "R", "Tenants"], ...(arr.data?.buckets ?? []).map((x) => [x.bucket, x.amount, x.tenants])])} />}>
          {arr.data && <AgeingChart buckets={arr.data.buckets} />}
        </ChartCard>
        <ChartCard title={r.vacancyTitle} sub={r.vacancySub} state={st(vac.loading, vac.error, !vac.data?.length)} action={<ExportBtn onClick={() => exp(r.vacancyTitle, [[r.cols.place, r.cols.unit, "Days", "Rent lost"], ...(vac.data ?? []).map((v) => [v.place, v.unit, v.days, v.loss])])} />}>
          <TickBarChart data={(vac.data ?? []).slice(0, 10).map((v) => ({ label: v.unit, value: v.days }))} name={r.kpi.vacancy} format={(v) => fill(r.days, { n: v })} />
        </ChartCard>
      </div>
      <GlassCard hover={false} className="space-y-3">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-h3 text-ink-900">{r.rentRollTitle}</h2><p className="text-[12px] text-ink-500">{r.rentRollSub}</p></div>
          {canExport && <PillButton size="sm" variant="secondary" icon={<Download className="h-3.5 w-3.5" />} onClick={() => exp(r.rentRollTitle, [[r.cols.place, r.cols.unit, r.cols.tenant, r.cols.rent, r.cols.end, r.cols.balance], ...(roll.data ?? []).map((x) => [x.place, x.unit, x.tenantName, x.rent, x.leaseEnd, x.balance])])}>{r.export}</PillButton>}</div>
        <DataTable caption={r.rentRollTitle} rows={roll.data ?? []} columns={cols} loading={roll.loading} error={roll.error} onRetry={roll.reload}
          card={(x) => <div className="flex min-w-0 justify-between gap-3"><div className="min-w-0"><TruncatedText text={`${x.unit} · ${x.tenantName}`} className="font-medium" /><TruncatedText text={x.place} className="text-[12px] text-ink-500" /></div><span className="shrink-0 tabular-nums">{formatZAR(x.rent)}</span></div>} />
      </GlassCard>
    </div>
  );
}
