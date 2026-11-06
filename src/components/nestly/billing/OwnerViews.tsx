import { useState } from "react";
import { toast } from "sonner";
import { BellRing, CalendarClock, FileDown, PiggyBank, Plus, Send, Trash2, TrendingUp } from "lucide-react";
import { CHANNELS, type Channel } from "@/mocks/billing";
import { billingService, tenantService } from "@/services";
import { EmptyState, GlassCard, PillButton, SegmentedChips, Skel, StatusChip, TruncatedText } from "@/components/nestly/primitives";
import { DataTable, KpiTile, Modal, PersonCell, type Column } from "@/components/nestly/composites";
import { ChartCard } from "@/components/nestly/charts";
import { SelectField } from "@/components/nestly/forms";
import { TextField } from "@/components/nestly/auth";
import { ConfirmDialog, SidePanel } from "@/components/nestly/overlays";
import { fill } from "@/components/nestly/properties/shared";
import { useUnitDirectory } from "@/components/nestly/tenants/shared";
import { addMonths, escalatedRent } from "@/lib/billing-rules";
import { useAppState } from "@/lib/app-state";
import { useData } from "@/lib/use-data";
import { formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { AgeingChart, b, nTenants, Money, StatementDocument, StatementTable, todayIso } from "./shared";

type ArrearsData = Awaited<ReturnType<typeof billingService.arrears>>;
type ArrearsRow = ArrearsData["tenants"][number];
const Err = ({ onRetry }: { onRetry: () => void }) => <GlassCard hover={false} className="p-4"><EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={onRetry}>{t.common.retry}</PillButton>} /></GlassCard>;

/* ---------- Arrears ---------- */
export function ArrearsView({ data }: { data: { data: ArrearsData | null; loading: boolean; error: boolean; reload: () => void } }) {
  const a = b.arrears;
  const dir = useUnitDirectory();
  const [remind, setRemind] = useState<ArrearsRow[] | null>(null);
  if (data.error) return <Err onRetry={data.reload} />;
  const rows = data.data?.tenants ?? [];
  const cell = (v: number) => (v ? <Money v={v} className="text-ink-900" /> : <span className="text-ink-500">—</span>);
  const columns: Column<ArrearsRow>[] = [
    { key: "t", header: b.cols.tenant, render: (r) => <PersonCell name={r.name} email={dir.place(r)} src={r.avatar} /> },
    { key: "b0", header: a.buckets.b0, className: "text-right", render: (r) => cell(r.b0) },
    { key: "b30", header: a.buckets.b30, className: "text-right", render: (r) => cell(r.b30) },
    { key: "b60", header: a.buckets.b60, className: "text-right", render: (r) => cell(r.b60) },
    { key: "b90", header: a.buckets.b90, className: "text-right", render: (r) => cell(r.b90) },
    { key: "tot", header: a.total, className: "text-right", render: (r) => <Money v={r.total} className="font-semibold text-danger" /> },
    { key: "lp", header: a.lastPaid, render: (r) => <span className="text-ink-500">{r.lastPayment ? formatDate(r.lastPayment) : a.never}</span> },
    { key: "x", header: "", render: (r) => <PillButton size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setRemind([r]); }} icon={<BellRing className="h-3.5 w-3.5" />}>{a.remind}</PillButton> },
  ];
  const card = (r: ArrearsRow) => (
    <div className="space-y-2">
      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><TruncatedText text={r.name} className="font-medium text-ink-900" /><TruncatedText text={dir.place(r)} className="text-[12px] text-ink-500" /></div><Money v={r.total} className="font-semibold text-danger" /></div>
      <div className="flex flex-wrap gap-1.5">{(["b0", "b30", "b60", "b90"] as const).filter((k) => r[k] > 0).map((k) => <StatusChip key={k} tone={k === "b90" ? "danger" : k === "b0" ? "neutral" : "warning"}>{`${a.buckets[k]}: ${formatZAR(r[k])}`}</StatusChip>)}</div>
      <PillButton size="sm" variant="secondary" onClick={() => setRemind([r])} icon={<BellRing className="h-3.5 w-3.5" />}>{a.remind}</PillButton>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ChartCard title={a.chartTitle} sub={a.chartSub} state={data.loading ? "loading" : rows.length ? "ready" : "empty"}><AgeingChart buckets={data.data?.buckets ?? []} /></ChartCard>
        <div className="grid grid-cols-2 gap-3">
          {(data.data?.buckets ?? [{ bucket: "b0" }, { bucket: "b30" }, { bucket: "b60" }, { bucket: "b90" }]).map((x) => (
            <KpiTile key={x.bucket} loading={data.loading} label={`${a.buckets[x.bucket as keyof typeof a.buckets]} · ${nTenants("tenants" in x ? x.tenants : 0)}`} value={formatZAR("amount" in x ? x.amount : 0, { decimals: false })} unit="" variant="plain" />
          ))}
        </div>
      </div>
      <GlassCard hover={false} className="space-y-3 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2 px-1"><h2 className="text-h3 text-ink-900">{a.tableTitle}</h2>{rows.length > 1 && <PillButton className="ml-auto" size="sm" onClick={() => setRemind(rows)} icon={<Send className="h-3.5 w-3.5" />}>{fill(a.remindAll, { n: rows.length })}</PillButton>}</div>
        <DataTable rows={rows} columns={columns} loading={data.loading} caption={a.tableTitle} card={card} tableClassName="min-w-[900px]" empty={<EmptyState icon={<PiggyBank className="h-6 w-6" />} title={a.empty} body={a.emptyBody} />} />
      </GlassCard>
      {remind && <ReminderModal rows={remind} place={(r) => dir.place(r)} onClose={() => setRemind(null)} />}
    </div>
  );
}

const TEMPLATES = ["friendly", "firm", "final"] as const;
function ReminderModal({ rows, place, onClose }: { rows: ArrearsRow[]; place: (r: ArrearsRow) => string; onClose: () => void }) {
  const m = b.remind;
  const [tpl, setTpl] = useState<(typeof TEMPLATES)[number]>(rows.some((r) => r.b90 > 0) ? "final" : rows.some((r) => r.b30 + r.b60 > 0) ? "firm" : "friendly");
  const [ch, setCh] = useState<Channel>("whatsapp");
  const [busy, setBusy] = useState(false);
  const first = rows[0]!;
  const send = async () => {
    setBusy(true);
    try { const n = await billingService.remind(rows.map((r) => r.tenantId), tpl, ch); toast.success(fill(m.sent, { n })); onClose(); } finally { setBusy(false); }
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={rows.length > 1 ? fill(m.titleMany, { n: rows.length }) : m.title} wide
      footer={<><PillButton variant="secondary" onClick={onClose}>{t.common.cancel}</PillButton><PillButton onClick={send} disabled={busy}>{busy ? t.common.working : m.submit}</PillButton></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label={m.template} value={tpl} onChange={(e) => setTpl(e.target.value as typeof tpl)}>{TEMPLATES.map((x) => <option key={x} value={x}>{m.templates[x]}</option>)}</SelectField>
          <SelectField label={m.channel} value={ch} onChange={(e) => setCh(e.target.value as Channel)}>{CHANNELS.map((c) => <option key={c} value={c}>{b.channels[c]}</option>)}</SelectField>
        </div>
        <div className="space-y-2"><p className="text-overline text-ink-500">{m.preview}</p>
          <p className="break-words rounded-[5.75px] bg-olive-100 p-4 text-[14px] text-ink-900">{fill(m.bodies[tpl], { name: first.name.split(" ")[0] ?? first.name, amount: formatZAR(first.total), place: place(first) })}</p>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Statements ---------- */
const monthsAgo = (n: number) => addMonths(`${todayIso().slice(0, 7)}-01`, -n);
export function StatementsView() {
  const { propertyId } = useAppState();
  const tenants = useData(() => tenantService.list(propertyId), [propertyId]);
  const dir = useUnitDirectory();
  const [tenantId, setTenantId] = useState("");
  const [from, setFrom] = useState(monthsAgo(3));
  const [to, setTo] = useState(todayIso());
  const [preview, setPreview] = useState(false);
  const tid = tenantId || tenants.data?.[0]?.id || "";
  const x = tenants.data?.find((y) => y.id === tid);
  const st = useData(() => (tid ? billingService.statement(tid, from, to) : Promise.resolve(null)), [tid, from, to]);
  const s = b.st;
  return (
    <div className="space-y-4">
      <GlassCard hover={false} className="grid gap-3 p-3 sm:grid-cols-2 md:p-4 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_auto] lg:items-end">
        <SelectField label={s.tenant} value={tid} onChange={(e) => setTenantId(e.target.value)}>{(tenants.data ?? []).map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</SelectField>
        <TextField label={s.from} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        <TextField label={s.to} type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        <PillButton className="sm:col-span-2 lg:col-span-1" variant="secondary" disabled={!st.data} onClick={() => setPreview(true)} icon={<FileDown className="h-4 w-4" />}>{s.download}</PillButton>
      </GlassCard>
      {st.error ? <Err onRetry={st.reload} /> : (
        <GlassCard hover={false} className="space-y-3 p-4 md:p-5">
          {x && <div className="min-w-0"><TruncatedText text={x.name} className="text-h3 text-ink-900" /><TruncatedText text={`${dir.place(x)} · ${fill(s.period, { from: formatDate(from), to: formatDate(to) })}`} className="text-[13px] text-ink-500" /></div>}
          {tenants.loading || st.loading || !st.data ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skel key={i} className="h-10" />)}</div>
            : !st.data.lines.length && !st.data.opening ? <EmptyState icon={<CalendarClock className="h-6 w-6" />} title={s.noLines} body={s.noLinesBody} />
            : <StatementTable st={st.data} />}
        </GlassCard>
      )}
      {st.data && x && (
        <Modal open={preview} onOpenChange={setPreview} title={s.previewTitle} wide
          footer={<PillButton onClick={() => { toast.info(s.downloaded); setPreview(false); }} icon={<FileDown className="h-4 w-4" />}>{s.download}</PillButton>}>
          <StatementDocument name={x.name} place={dir.place(x)} from={from} to={to} st={st.data} />
        </Modal>
      )}
    </div>
  );
}

/* ---------- Deposits ---------- */
type DepRow = Awaited<ReturnType<typeof billingService.deposits>>[number];
export function DepositsView({ id, set }: { id?: string | undefined; set: (p: { id?: string | undefined }, replace?: boolean) => void }) {
  const d = b.dep;
  const { propertyId } = useAppState();
  const deps = useData(() => billingService.deposits(propertyId), [propertyId]);
  const dir = useUnitDirectory();
  const tenants = useData(() => tenantService.list(), []);
  const place = (tid: string) => { const x = tenants.data?.find((y) => y.id === tid); return x ? dir.place(x) : "—"; };
  const rows = deps.data ?? [];
  const sel = rows.find((r) => r.id === id) ?? null;
  const held = rows.filter((r) => r.status === "held");
  if (deps.error) return <Err onRetry={deps.reload} />;
  const columns: Column<DepRow>[] = [
    { key: "t", header: b.cols.tenant, render: (r) => <div className="min-w-0 max-w-[220px]"><TruncatedText text={r.tenantName} className="text-ink-900" /><TruncatedText text={place(r.tenantId)} className="text-[12px] text-ink-500" /></div> },
    { key: "since", header: d.heldSince, render: (r) => <span className="text-ink-500">{formatDate(r.heldSince)}</span> },
    { key: "amt", header: d.held, className: "text-right", render: (r) => <Money v={r.amount} /> },
    { key: "int", header: d.interest, className: "text-right", render: (r) => <Money v={r.interest} className="text-success" /> },
    { key: "ded", header: d.deductions, className: "text-right", render: (r) => r.deductionsTotal ? <Money v={r.deductionsTotal} className="text-danger" /> : <span className="text-ink-500">—</span> },
    { key: "ref", header: d.refund, className: "text-right", render: (r) => <Money v={r.status === "refunded" ? r.refundAmount ?? 0 : r.refund} className="font-medium text-ink-900" /> },
    { key: "s", header: b.cols.status, render: (r) => <StatusChip tone={r.status === "held" ? "info" : "success"} dot>{d.status[r.status]}</StatusChip> },
  ];
  const card = (r: DepRow) => (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><TruncatedText text={r.tenantName} className="font-medium text-ink-900" /><TruncatedText text={place(r.tenantId)} className="text-[12px] text-ink-500" /></div><StatusChip tone={r.status === "held" ? "info" : "success"} dot>{d.status[r.status]}</StatusChip></div>
      <div className="grid grid-cols-3 gap-2 text-[12px]"><div><p className="text-ink-500">{d.held}</p><Money v={r.amount} className="text-ink-900" /></div><div><p className="text-ink-500">{d.interest}</p><Money v={r.interest} className="text-success" /></div><div><p className="text-ink-500">{d.refund}</p><Money v={r.refund} className="font-medium text-ink-900" /></div></div>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiTile loading={deps.loading} label={d.totalHeld} value={formatZAR(held.reduce((a, r) => a + r.amount, 0), { decimals: false })} unit="" variant="plain" />
        <KpiTile loading={deps.loading} label={d.interest} value={formatZAR(held.reduce((a, r) => a + r.interest, 0), { decimals: false })} unit="" variant="plain" />
        <KpiTile loading={deps.loading} label={d.deductions} value={formatZAR(held.reduce((a, r) => a + r.deductionsTotal, 0), { decimals: false })} unit="" variant="plain" />
        <KpiTile loading={deps.loading} label={d.refund} value={formatZAR(held.reduce((a, r) => a + r.refund, 0), { decimals: false })} unit="" variant="plain" />
      </div>
      <GlassCard hover={false} className="space-y-2 p-3 md:p-4">
        <div className="px-1"><h2 className="text-h3 text-ink-900">{d.title}</h2><p className="text-[13px] text-ink-500">{d.sub}</p></div>
        <DataTable rows={rows} columns={columns} loading={deps.loading} caption={d.title} selectedId={id} onSelect={(i) => set({ id: i }, false)} card={card} tableClassName="min-w-[820px]" />
      </GlassCard>
      <SidePanel open={!!sel} onOpenChange={(o) => !o && set({ id: undefined })} title={sel ? fill(d.panel, { name: sel.tenantName }) : ""}>
        {sel && <DepositDetail key={sel.id} r={sel} />}
      </SidePanel>
    </div>
  );
}

function DepositDetail({ r }: { r: DepRow }) {
  const d = b.dep;
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [errs, setErrs] = useState<{ item?: string; amount?: string }>({});
  const [confirm, setConfirm] = useState(false);
  const lines = r.deductions;
  const add = async () => {
    const amt = Number(amount.replace(",", "."));
    const e: typeof errs = {};
    if (item.trim().length < 3) e.item = d.errs.item;
    if (!(amt > 0)) e.amount = d.errs.amount;
    setErrs(e);
    if (Object.keys(e).length) return;
    await billingService.addDeduction(r.id, item.trim(), amt);
    setItem(""); setAmount(""); toast.success(d.added);
  };
  const refunded = r.status === "refunded";
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 text-[14px]">
        {[[d.held, formatZAR(r.amount)], [d.heldSince, formatDate(r.heldSince)], [d.interest, `${formatZAR(r.interest)} · ${fill(d.rate, { rate: String(r.ratePct).replace(".", ",") })}`], [d.refund, formatZAR(r.refund)]].map(([k, v]) => (
          <div key={k} className="min-w-0 rounded-[5.75px] bg-olive-100/70 p-3"><dt className="text-overline text-ink-500">{k}</dt><dd><TruncatedText text={v!} className="font-medium text-ink-900" /></dd></div>
        ))}
      </dl>
      <section className="space-y-2">
        <h3 className="text-overline text-ink-500">{d.deductions}</h3>
        {lines.length === 0 ? <p className="text-[14px] text-ink-500">{d.none}</p> : (
          <ul className="divide-y divide-border-soft rounded-[5.75px] border border-border-soft">
            {lines.map((x) => (
              <li key={x.id} className="flex min-w-0 items-center gap-3 p-3">
                <div className="min-w-0 flex-1"><TruncatedText text={x.item} className="text-[14px] text-ink-900" />{x.note && <TruncatedText text={x.note} className="text-[12px] text-ink-500" />}</div>
                <Money v={x.amount} className="text-[14px] font-medium text-danger" />
                {!refunded && <button type="button" aria-label={fill(d.remove, { item: x.item })} onClick={async () => { await billingService.removeDeduction(r.id, x.id); toast.success(d.removed); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-olive-100"><Trash2 className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
        )}
        {!refunded && (
          <div className="grid gap-2 rounded-[5.75px] border border-dashed border-border-soft p-3 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-end">
            <TextField label={d.item} value={item} error={errs.item} onChange={(e) => setItem(e.target.value)} />
            <TextField label={d.amount} inputMode="decimal" value={amount} error={errs.amount} onChange={(e) => setAmount(e.target.value)} />
            <PillButton size="sm" variant="secondary" className="sm:mb-1.5" onClick={add} icon={<Plus className="h-3.5 w-3.5" />}>{d.add}</PillButton>
          </div>
        )}
      </section>
      {refunded ? <StatusChip tone="success">{fill(d.refundedOn, { amount: formatZAR(r.refundAmount ?? 0), date: formatDate(r.refundedAt ?? "") })}</StatusChip>
        : <PillButton onClick={() => setConfirm(true)}>{d.refundBtn}</PillButton>}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} tone="primary" confirmLabel={d.refundBtn} title={fill(d.refundTitle, { amount: formatZAR(r.refund), name: r.tenantName })}
        body={fill(d.refundBody, { deposit: formatZAR(r.amount), interest: formatZAR(r.interest), deductions: formatZAR(r.deductionsTotal) })}
        onConfirm={async () => { await billingService.refundDeposit(r.id); toast.success(d.refunded); }} />
    </div>
  );
}

/* ---------- Escalations ---------- */
type EscRow = Awaited<ReturnType<typeof billingService.escalations>>[number];
export function EscalationsView() {
  const e = b.esc;
  const { propertyId } = useAppState();
  const esc = useData(() => billingService.escalations(propertyId), [propertyId]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<"all" | EscRow["status"]>("all");
  if (esc.error) return <Err onRetry={esc.reload} />;
  const all = esc.data ?? [];
  const rows = all.filter((r) => f === "all" || r.status === f);
  const tone = (s: EscRow["status"]): "success" | "info" | "warning" => (s === "applied" ? "success" : s === "notice_sent" ? "info" : "warning");
  const act = (r: EscRow) => r.status === "scheduled" ? <PillButton size="sm" variant="secondary" onClick={async (ev) => { ev.stopPropagation(); await billingService.sendEscalationNotice(r.id); toast.success(e.noticeSent); }}>{e.sendNotice}</PillButton>
    : r.status === "notice_sent" ? <PillButton size="sm" onClick={async (ev) => { ev.stopPropagation(); await billingService.applyEscalation(r.id); toast.success(e.applied); }}>{e.applyNow}</PillButton> : null;
  const columns: Column<EscRow>[] = [
    { key: "t", header: b.cols.tenant, render: (r) => <TruncatedText text={r.tenantName} className="block max-w-[220px] text-ink-900" /> },
    { key: "c", header: e.current, className: "text-right", render: (r) => <Money v={r.currentRent} className="text-ink-500" /> },
    { key: "p", header: e.pct, className: "text-right", render: (r) => <span className="tabular-nums">{String(r.pct).replace(".", ",")}%</span> },
    { key: "n", header: e.newRent, className: "text-right", render: (r) => <Money v={r.newRent} className="font-medium text-ink-900" /> },
    { key: "d", header: e.effective, render: (r) => <span className="text-ink-500">{formatDate(r.effectiveDate)}</span> },
    { key: "s", header: b.cols.status, render: (r) => <StatusChip tone={tone(r.status)} dot>{e.status[r.status]}</StatusChip> },
    { key: "x", header: "", render: act },
  ];
  const card = (r: EscRow) => (
    <div className="space-y-2">
      <div className="flex items-start gap-2"><TruncatedText text={r.tenantName} className="min-w-0 flex-1 font-medium text-ink-900" /><StatusChip tone={tone(r.status)} dot>{e.status[r.status]}</StatusChip></div>
      <p className="text-[13px] text-ink-500"><Money v={r.currentRent} /> → <Money v={r.newRent} className="font-medium text-ink-900" /> · {String(r.pct).replace(".", ",")}% · {formatDate(r.effectiveDate)}</p>
      {act(r)}
    </div>
  );
  return (
    <div className="space-y-4">
      <GlassCard hover={false} className="flex flex-wrap items-center gap-3 p-3 md:p-4">
        <div className="flex min-w-0 basis-full items-start gap-3 sm:basis-auto"><TrendingUp className="mt-1 h-5 w-5 shrink-0 text-olive-700" aria-hidden /><div className="min-w-0"><h2 className="text-h3 text-ink-900">{e.title}</h2><p className="text-[13px] text-ink-500">{e.sub}</p></div></div>
        <PillButton className="ml-auto" size="sm" onClick={() => setOpen(true)} icon={<Plus className="h-3.5 w-3.5" />}>{e.schedule}</PillButton>
        <div className="basis-full"><SegmentedChips wrap label={e.title} value={f} onChange={setF} options={[{ value: "all" as const, label: b.all, count: all.length }, ...(["scheduled", "notice_sent", "applied"] as const).map((s) => ({ value: s, label: e.status[s], count: all.filter((r) => r.status === s).length }))]} /></div>
      </GlassCard>
      <GlassCard hover={false} className="p-3 md:p-4">
        <DataTable rows={rows} columns={columns} loading={esc.loading} caption={e.title} card={card} tableClassName="min-w-[820px]" empty={<EmptyState icon={<TrendingUp className="h-6 w-6" />} title={e.empty} />} />
      </GlassCard>
      {open && <EscalationModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function EscalationModal({ onClose }: { onClose: () => void }) {
  const e = b.esc;
  const tenants = useData(() => tenantService.list(), []);
  const dir = useUnitDirectory();
  const [tenantId, setTenantId] = useState("");
  const [pct, setPct] = useState("8");
  const [date, setDate] = useState("");
  const [errs, setErrs] = useState<{ tenant?: string; pct?: string; date?: string }>({});
  const x = tenants.data?.find((y) => y.id === tenantId);
  const p = Number(pct.replace(",", "."));
  const pickTenant = (id: string) => {
    setTenantId(id);
    const y = tenants.data?.find((z) => z.id === id);
    if (y) { let d = y.leaseStart; while (d <= todayIso()) d = addMonths(d, 12); setDate(d); }
  };
  const save = async () => {
    const er: typeof errs = {};
    if (!tenantId) er.tenant = e.errs.tenant;
    if (!(p >= 0.1 && p <= 25)) er.pct = e.errs.pct;
    if (!date || date <= todayIso()) er.date = e.errs.date;
    setErrs(er);
    if (Object.keys(er).length) return;
    await billingService.scheduleEscalation(tenantId, p, date);
    toast.success(e.scheduled); onClose();
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={e.schedule} wide
      footer={<><PillButton variant="secondary" onClick={onClose}>{t.common.cancel}</PillButton><PillButton onClick={save}>{e.schedule}</PillButton></>}>
      <div className="space-y-4">
        <SelectField label={b.cols.tenant} value={tenantId} error={errs.tenant} onChange={(ev) => pickTenant(ev.target.value)}><option value="">{b.create.pickTenant}</option>{(tenants.data ?? []).map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</SelectField>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={e.pct} inputMode="decimal" value={pct} error={errs.pct} onChange={(ev) => setPct(ev.target.value)} />
          <TextField label={e.effective} type="date" value={date} min={todayIso()} error={errs.date} onChange={(ev) => setDate(ev.target.value)} />
        </div>
        {x && p > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-[5.75px] bg-olive-100 p-3 text-[14px]"><span className="text-ink-500">{e.current} <Money v={x.rent} /></span><span className="font-semibold text-ink-900">{e.newRent} <Money v={escalatedRent(x.rent, p)} /></span></div>
            <p className="text-overline text-ink-500">{e.noticePreview}</p>
            <p className="break-words rounded-[5.75px] border border-border-soft p-3 text-[14px] text-ink-900">{fill(e.notice, { name: x.name.split(" ")[0] ?? x.name, place: dir.place(x), pct: String(p).replace(".", ","), current: formatZAR(x.rent), next: formatZAR(escalatedRent(x.rent, p)), date: date ? formatDate(date) : "—" })}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
