import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, FileText, Link2, Plus, Receipt, Repeat, Search, Send, Wallet } from "lucide-react";
import { PAY_METHODS, PAY_STATUSES, type InvoiceStatus, type PayMethod, type PayStatus } from "@/mocks/billing";
import { billingService, tenantService, type InvoiceView, type Proof } from "@/services";
import { EmptyState, GlassCard, PageHeader, PillButton, SegmentedChips, Skel, StatusChip, TruncatedText } from "@/components/nestly/primitives";
import { DataTable, KpiTile, Modal, type Column } from "@/components/nestly/composites";
import { SelectField } from "@/components/nestly/forms";
import { TextField } from "@/components/nestly/auth";
import { ConfirmDialog, SidePanel } from "@/components/nestly/overlays";
import { fill } from "@/components/nestly/properties/shared";
import { useUnitDirectory } from "@/components/nestly/tenants/shared";
import { nextInvoiceDates } from "@/lib/billing-rules";
import { useAppState } from "@/lib/app-state";
import { useData } from "@/lib/use-data";
import { formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { ArrearsView, DepositsView, EscalationsView, StatementsView } from "./OwnerViews";
import { b, nPayments, nTenants, downloadCsv, ErrorText, InvoiceDocument, InvStatusChip, Money, PayStatusChip, ProofPicker, SendInvoiceDialog, todayIso } from "./shared";

export const BILL_VIEWS = ["invoices", "payments", "arrears", "statements", "deposits", "escalations", "reconcile"] as const;
export type BillView = (typeof BILL_VIEWS)[number];
export type BillSearch = { view?: BillView | undefined; id?: string | undefined };
type SetSearch = (p: Partial<BillSearch>, replace?: boolean) => void;
export type PaymentRow = Awaited<ReturnType<typeof billingService.payments>>[number];

const Search_ = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <label className="relative block min-w-0 flex-1 sm:max-w-xs">
    <span className="sr-only">{b.search}</span>
    <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={b.search} className="h-11 w-full rounded-[5.75px] border border-input bg-surface-solid pl-9 pr-3 text-[15px] outline-none focus:border-olive-700" />
  </label>
);
export const ErrorCard = ({ onRetry }: { onRetry: () => void }) => <GlassCard hover={false} className="p-4"><EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={onRetry}>{t.common.retry}</PillButton>} /></GlassCard>;

export function OwnerBilling({ view, id, set }: { view: BillView; id?: string | undefined; set: SetSearch }) {
  const { propertyId } = useAppState();
  const inv = useData(() => billingService.invoices(propertyId), [propertyId]);
  const pays = useData(() => billingService.payments(propertyId), [propertyId]);
  const arr = useData(() => billingService.arrears(propertyId), [propertyId]);
  const loading = inv.loading || pays.loading || arr.loading;
  const ym = todayIso().slice(0, 7);
  const month = (inv.data ?? []).filter((i) => i.dueDate.slice(0, 7) === ym && i.status !== "void" && i.status !== "draft");
  const billed = month.reduce((a, i) => a + i.total, 0);
  const collectedOnMonth = month.reduce((a, i) => a + i.paid, 0);
  const collected = (pays.data ?? []).filter((p) => p.status === "cleared" && p.date.slice(0, 7) === ym && p.tenantId).reduce((a, p) => a + p.amount, 0);
  const pending = (pays.data ?? []).filter((p) => p.status === "pending");
  const rate = billed ? Math.round((collectedOnMonth / billed) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title={b.title} muted={b.muted} sub={arr.data ? fill(b.sub, { due: formatZAR(arr.data.total), n: arr.data.tenants.length }) : undefined}
        actions={<div className="flex flex-wrap gap-2"><Link to="/invoices/new" className="inline-flex h-11 items-center gap-3 rounded-full bg-olive-700 pl-5 pr-1.5 text-[14px] font-medium text-primary-foreground shadow-soft hover:bg-olive-800">{b.newInvoice}<span className="grid h-8 w-8 place-items-center rounded-full bg-surface-solid text-olive-900"><Plus className="h-4 w-4" /></span></Link></div>} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiTile loading={loading} label={b.kpi.billed} value={formatZAR(billed, { decimals: false })} unit="" variant="plain" />
        <KpiTile loading={loading} label={b.kpi.collected} value={formatZAR(collected, { decimals: false })} unit="" variant="plain" delta={`${rate}%`} deltaLabel={b.kpi.ofBilled} />
        <KpiTile loading={loading} label={b.kpi.arrears} value={formatZAR(arr.data?.total ?? 0, { decimals: false })} unit="" variant="tick-bar" visual={(arr.data?.buckets ?? []).map((x) => x.amount)} tip={nTenants(arr.data?.tenants.length ?? 0)} />
        <KpiTile loading={loading} label={`${b.kpi.pending} · ${nPayments(pending.length)}`} value={formatZAR(pending.reduce((a, p) => a + p.amount, 0), { decimals: false })} unit="" variant="plain" />
      </div>
      <SegmentedChips label={b.title} value={view} onChange={(v) => set({ view: v === "invoices" ? undefined : v, id: undefined })} options={BILL_VIEWS.map((v) => ({ value: v, label: b.views[v] }))} />
      {view === "invoices" ? <InvoicesView data={inv} id={id} set={set} />
        : view === "payments" ? <PaymentsView data={pays} id={id} set={set} />
        : view === "arrears" ? <ArrearsView data={arr} />
        : view === "statements" ? <StatementsView />
        : view === "deposits" ? <DepositsView id={id} set={set} />
        : view === "escalations" ? <EscalationsView />
        : <ReconcileView data={pays} />}
    </div>
  );
}

/* ---------- Invoices ---------- */
type InvFilter = "all" | InvoiceStatus;
function InvoicesView({ data, id, set }: { data: ReturnType<typeof useData<InvoiceView[]>>; id?: string | undefined; set: SetSearch }) {
  const dir = useUnitDirectory();
  const [q, setQ] = useState("");
  const [f, setF] = useState<InvFilter>("all");
  const [send, setSend] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [capture, setCapture] = useState(false);
  const all = data.data ?? [];
  const rows = all.filter((i) => (f === "all" || i.status === f) && (!q.trim() || `${i.number} ${i.tenantName}`.toLowerCase().includes(q.trim().toLowerCase())));
  const sel = all.find((i) => i.id === id) ?? null;
  const place = (i: Pick<InvoiceView, "propertyId" | "unitId">) => dir.place(i);
  const count = (s: InvoiceStatus) => all.filter((i) => i.status === s).length;
  const filters: InvFilter[] = ["all", "overdue", "sent", "partial", "paid", "draft", "void"];

  const columns: Column<InvoiceView>[] = [
    { key: "n", header: b.cols.invoice, render: (i) => <span className="font-medium tabular-nums text-ink-900">{i.number}</span> },
    { key: "t", header: b.cols.tenant, render: (i) => <div className="min-w-0 max-w-[220px]"><TruncatedText text={i.tenantName} className="text-ink-900" /><TruncatedText text={place(i)} className="text-[12px] text-ink-500" /></div> },
    { key: "due", header: b.cols.due, render: (i) => <span className="text-ink-500">{formatDate(i.dueDate)}</span> },
    { key: "tot", header: b.cols.total, className: "text-right", render: (i) => <Money v={i.total} /> },
    { key: "out", header: b.cols.outstanding, className: "text-right", render: (i) => <Money v={i.outstanding} className={i.outstanding && i.status === "overdue" ? "font-medium text-danger" : "text-ink-500"} /> },
    { key: "s", header: b.cols.status, render: (i) => <InvStatusChip s={i.status} /> },
  ];
  const card = (i: InvoiceView) => (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><TruncatedText text={i.tenantName} className="font-medium text-ink-900" /><TruncatedText text={`${i.number} · ${place(i)}`} className="text-[12px] text-ink-500" /></div><InvStatusChip s={i.status} /></div>
      <div className="flex items-center justify-between gap-2 text-[13px]"><span className="text-ink-500">{b.cols.due} {formatDate(i.dueDate)}</span><Money v={i.outstanding || i.total} className="font-medium text-ink-900" /></div>
    </div>
  );
  const exportCsv = () => downloadCsv("invoices", [["Invoice", "Tenant", "Property · unit", "Issued", "Due", "Total", "Paid", "Outstanding", "Status"], ...rows.map((i) => [i.number, i.tenantName, place(i), i.issueDate, i.dueDate, i.total.toFixed(2), i.paid.toFixed(2), i.outstanding.toFixed(2), b.statuses[i.status]])]);

  return (
    <div className="space-y-4">
      <GlassCard hover={false} className="space-y-3 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2"><Search_ value={q} onChange={setQ} /><div className="ml-auto flex gap-2"><PillButton variant="secondary" size="sm" onClick={exportCsv} icon={<Download className="h-3.5 w-3.5" />}>{b.export}</PillButton></div></div>
        <SegmentedChips wrap label={b.cols.status} value={f} onChange={setF} options={filters.map((s) => ({ value: s, label: s === "all" ? b.all : b.statuses[s], count: s === "all" ? all.length : count(s) }))} />
      </GlassCard>
      {data.error ? <ErrorCard onRetry={data.reload} /> : (
        <GlassCard hover={false} className="p-3 md:p-4">
          <DataTable rows={rows} columns={columns} loading={data.loading} caption={b.views.invoices} selectedId={id} onSelect={(i) => set({ id: i }, false)} card={card}
            empty={all.length === 0 ? <EmptyState icon={<Receipt className="h-6 w-6" />} title={b.emptyTitle} body={b.emptyBody} /> : <EmptyState icon={<Search className="h-6 w-6" />} title={b.zeroTitle} body={b.zeroBody} action={<PillButton variant="secondary" onClick={() => { setQ(""); setF("all"); }}>{b.clear}</PillButton>} />} />
        </GlassCard>
      )}
      <Schedules />
      <SidePanel open={!!sel} onOpenChange={(o) => !o && set({ id: undefined })} title={sel ? fill(b.panel.title, { number: sel.number }) : ""} wide
        footer={sel && sel.status !== "void" ? <>
          {sel.status !== "paid" && <PillButton variant="ghost" onClick={() => setVoidOpen(true)}>{b.panel.void}</PillButton>}
          {sel.sentAt && sel.outstanding > 0 && <PillButton variant="secondary" onClick={() => setCapture(true)}>{b.panel.record}</PillButton>}
          <PillButton onClick={() => setSend(true)} icon={<Send className="h-4 w-4" />}>{sel.sentAt ? b.panel.resend : b.panel.send}</PillButton>
        </> : undefined}>
        {sel && (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-500">{sel.sentAt ? fill(b.panel.sentVia, { channels: (sel.sentVia ?? []).map((c) => b.channels[c]).join(", "), date: formatDate(sel.sentAt) }) : b.panel.notSent}</p>
            <InvoiceDocument inv={sel} place={place(sel)} />
          </div>
        )}
      </SidePanel>
      {sel && <SendInvoiceDialog open={send} onOpenChange={setSend} inv={sel} />}
      {sel && <ConfirmDialog open={voidOpen} onOpenChange={setVoidOpen} title={b.panel.voidTitle} body={fill(b.panel.voidBody, { number: sel.number, name: sel.tenantName })} confirmLabel={b.panel.void}
        onConfirm={async () => { await billingService.voidInvoice(sel.id); toast.success(b.panel.voided); }} />}
      {sel && <CaptureModal open={capture} onOpenChange={setCapture} preset={{ tenantId: sel.tenantId, invoiceId: sel.id, amount: sel.outstanding }} />}
    </div>
  );
}

function Schedules() {
  const s = useData(() => billingService.schedules(), []);
  const dir = useUnitDirectory();
  const tenants = useData(() => tenantService.list(), []);
  const today = todayIso();
  const tenantOf = (id: string) => tenants.data?.find((x) => x.id === id);
  return (
    <GlassCard hover={false} className="space-y-3 p-4 md:p-5">
      <div className="flex items-start gap-3"><Repeat className="mt-1 h-5 w-5 shrink-0 text-olive-700" aria-hidden /><div className="min-w-0"><h2 className="text-h3 text-ink-900">{b.schedules.title}</h2><p className="text-[13px] text-ink-500">{b.schedules.sub}</p></div></div>
      {s.loading ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skel key={i} className="h-20" />)}</div>
        : s.error ? <EmptyState tone="error" title={t.common.errorTitle} action={<PillButton variant="secondary" onClick={s.reload}>{t.common.retry}</PillButton>} />
        : !(s.data ?? []).length ? <p className="text-[14px] text-ink-500">{b.schedules.empty}</p> : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {(s.data ?? []).map((r) => {
              const x = tenantOf(r.tenantId);
              const next = nextInvoiceDates(r.startDate, r.dayOfMonth, today, 1, r.endDate)[0];
              return (
                <li key={r.id} className="flex min-w-0 items-center gap-3 rounded-[5.75px] border border-border-soft bg-surface-solid/80 p-3">
                  <div className="min-w-0 flex-1">
                    <TruncatedText text={r.tenantName} className="font-medium text-ink-900" />
                    <TruncatedText text={`${x ? dir.place(x) : "—"} · ${formatZAR(r.total)}`} className="text-[12px] text-ink-500" />
                    <p className="text-[12px] text-ink-500">{fill(b.schedules.day, { n: r.dayOfMonth })}{r.active && next ? ` · ${fill(b.schedules.next, { date: formatDate(next) })}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusChip tone={r.active ? "success" : "neutral"} dot>{r.active ? b.schedules.active : b.schedules.paused}</StatusChip>
                    <button type="button" onClick={async () => { await billingService.toggleSchedule(r.id); toast.success(r.active ? b.schedules.paused_ok : b.schedules.resumed_ok); }} className="rounded-full px-2 py-0.5 text-[12px] font-medium text-olive-700 hover:bg-olive-100">{r.active ? b.schedules.pause : b.schedules.resume}</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
    </GlassCard>
  );
}

/* ---------- Record payment ---------- */
export function CaptureModal({ open, onOpenChange, preset }: { open: boolean; onOpenChange: (o: boolean) => void; preset?: { tenantId?: string; invoiceId?: string; amount?: number } }) {
  const c = b.capture;
  const tenants = useData(() => tenantService.list(), []);
  const invs = useData(() => billingService.invoices(), []);
  const [tenantId, setTenantId] = useState(preset?.tenantId ?? "");
  const [invoiceId, setInvoiceId] = useState(preset?.invoiceId ?? "");
  const [amount, setAmount] = useState(preset?.amount ? String(preset.amount) : "");
  const [method, setMethod] = useState<PayMethod>("eft");
  const [date, setDate] = useState(todayIso());
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<Proof | null>(null);
  const [errs, setErrs] = useState<Partial<Record<"tenant" | "amount" | "date", string>>>({});
  const [busy, setBusy] = useState(false);
  const open_ = (invs.data ?? []).filter((i) => i.tenantId === tenantId && i.outstanding > 0);
  const submit = async () => {
    const amt = Number(amount.replace(",", "."));
    const e: typeof errs = {};
    if (!tenantId) e.tenant = c.errs.tenant;
    if (!(amt > 0)) e.amount = c.errs.amount;
    if (!date) e.date = c.errs.date;
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try { await billingService.capture({ tenantId, invoiceId: invoiceId || undefined, amount: amt, method, date, reference, proof: proof ?? undefined }); toast.success(c.saved); onOpenChange(false); }
    catch { toast.error(t.common.errorBody); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={c.title} wide
      footer={<><PillButton variant="secondary" onClick={() => onOpenChange(false)}>{t.common.cancel}</PillButton><PillButton onClick={submit} disabled={busy}>{busy ? t.common.working : c.submit}</PillButton></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><SelectField label={c.tenant} value={tenantId} error={errs.tenant} onChange={(e) => { setTenantId(e.target.value); setInvoiceId(""); }}><option value="">{b.create.pickTenant}</option>{(tenants.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectField></div>
        <div className="sm:col-span-2"><SelectField label={c.invoice} value={invoiceId} disabled={!tenantId} onChange={(e) => { setInvoiceId(e.target.value); const i = open_.find((x) => x.id === e.target.value); if (i) setAmount(String(i.outstanding)); }}><option value="">{c.none}</option>{open_.map((i) => <option key={i.id} value={i.id}>{`${i.number} · ${formatZAR(i.outstanding)}`}</option>)}</SelectField></div>
        <TextField label={c.amount} inputMode="decimal" value={amount} error={errs.amount} onChange={(e) => setAmount(e.target.value)} />
        <SelectField label={c.method} value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>{PAY_METHODS.filter((m) => m !== "gateway").map((m) => <option key={m} value={m}>{b.methods[m]}</option>)}</SelectField>
        <TextField label={c.date} type="date" value={date} max={todayIso()} error={errs.date} onChange={(e) => setDate(e.target.value)} />
        <TextField label={c.ref} placeholder={c.refPh} value={reference} onChange={(e) => setReference(e.target.value)} />
        <div className="sm:col-span-2"><ProofPicker value={proof} onChange={setProof} /></div>
        {method === "eft" && <p className="text-[13px] text-ink-500 sm:col-span-2">{c.eftPending}</p>}
      </div>
    </Modal>
  );
}

/* ---------- Payments ---------- */
function PaymentsView({ data, id, set }: { data: ReturnType<typeof useData<PaymentRow[]>>; id?: string | undefined; set: SetSearch }) {
  const [f, setF] = useState<"all" | PayStatus>("all");
  const [capture, setCapture] = useState(false);
  const all = (data.data ?? []).filter((p) => p.tenantId);
  const rows = all.filter((p) => f === "all" || p.status === f);
  const sel = all.find((p) => p.id === id) ?? null;
  const columns: Column<PaymentRow>[] = [
    { key: "ref", header: b.cols.ref, render: (p) => <TruncatedText text={p.ref} className="block max-w-[180px] font-medium text-ink-900" /> },
    { key: "t", header: b.cols.tenant, render: (p) => <TruncatedText text={p.tenantName} className="block max-w-[200px] text-ink-900" /> },
    { key: "i", header: b.cols.invoice, render: (p) => <span className="text-ink-500">{p.invoiceNumber ?? "—"}</span> },
    { key: "m", header: b.cols.method, render: (p) => <span className="text-ink-500">{b.methods[p.method]}</span> },
    { key: "d", header: b.cols.date, render: (p) => <span className="text-ink-500">{formatDate(p.date)}</span> },
    { key: "a", header: b.cols.amount, className: "text-right", render: (p) => <Money v={p.amount} className="font-medium text-ink-900" /> },
    { key: "s", header: b.cols.status, render: (p) => <PayStatusChip s={p.status} /> },
  ];
  const card = (p: PaymentRow) => (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><TruncatedText text={p.tenantName} className="font-medium text-ink-900" /><TruncatedText text={`${p.ref} · ${b.methods[p.method]}`} className="text-[12px] text-ink-500" /></div><PayStatusChip s={p.status} /></div>
      <div className="flex items-center justify-between text-[13px]"><span className="text-ink-500">{formatDate(p.date)}</span><Money v={p.amount} className="font-medium text-ink-900" /></div>
    </div>
  );
  const act = async (s: PayStatus, msg: string) => { if (!sel) return; await billingService.setPaymentStatus(sel.id, s); toast.success(msg); };
  return (
    <div className="space-y-4">
      <GlassCard hover={false} className="flex flex-wrap items-center gap-2 p-3 md:p-4">
        <SegmentedChips wrap label={b.cols.status} value={f} onChange={setF} options={[{ value: "all" as const, label: b.all, count: all.length }, ...PAY_STATUSES.map((s) => ({ value: s, label: b.payStatuses[s], count: all.filter((p) => p.status === s).length }))]} />
        <div className="ml-auto flex flex-wrap gap-2">
          <PillButton variant="secondary" size="sm" onClick={() => downloadCsv("payments", [["Reference", "Tenant", "Invoice", "Method", "Date", "Amount", "Status"], ...rows.map((p) => [p.ref, p.tenantName, p.invoiceNumber ?? "", b.methods[p.method], p.date, p.amount.toFixed(2), b.payStatuses[p.status]])])} icon={<Download className="h-3.5 w-3.5" />}>{b.export}</PillButton>
          <PillButton size="sm" onClick={() => setCapture(true)} icon={<Plus className="h-3.5 w-3.5" />}>{b.record}</PillButton>
        </div>
      </GlassCard>
      {data.error ? <ErrorCard onRetry={data.reload} /> : (
        <GlassCard hover={false} className="p-3 md:p-4">
          <DataTable rows={rows} columns={columns} loading={data.loading} caption={b.views.payments} selectedId={id} onSelect={(i) => set({ id: i }, false)} card={card} empty={<EmptyState icon={<Wallet className="h-6 w-6" />} title={b.zeroTitle} body={b.zeroBody} />} />
        </GlassCard>
      )}
      {capture && <CaptureModal open={capture} onOpenChange={setCapture} />}
      <SidePanel open={!!sel} onOpenChange={(o) => !o && set({ id: undefined })} title={sel ? fill(b.payPanel.title, { ref: sel.ref }) : ""}
        footer={sel ? <>
          {sel.status === "pending" && <PillButton variant="ghost" onClick={() => act("failed", b.payPanel.failed)}>{b.payPanel.markFailed}</PillButton>}
          {sel.status === "pending" && <PillButton onClick={() => act("cleared", b.payPanel.cleared)}>{b.payPanel.markCleared}</PillButton>}
          {sel.status === "cleared" && sel.source === "manual" && <PillButton variant="secondary" onClick={() => act("reversed", b.payPanel.reversed)}>{b.payPanel.reverse}</PillButton>}
        </> : undefined}>
        {sel && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3"><Money v={sel.amount} className="text-h2 text-ink-900" /><PayStatusChip s={sel.status} /></div>
            <dl className="grid grid-cols-2 gap-3 text-[14px]">
              {[[b.cols.tenant, sel.tenantName], [b.cols.invoice, sel.invoiceNumber ?? b.capture.none], [b.cols.method, b.methods[sel.method]], [b.cols.date, formatDate(sel.date)], [b.cols.ref, sel.ref], ["", b.payPanel.source[sel.source]]].map(([k, v], i) => (
                <div key={i} className="min-w-0"><dt className="text-overline text-ink-500">{k || "\u00a0"}</dt><dd><TruncatedText text={v ?? ""} className="text-ink-900" /></dd></div>
              ))}
            </dl>
            {sel.note && <p className="rounded-[5.75px] bg-olive-100 p-3 text-[13px] text-ink-900">{sel.note}</p>}
            <div className="space-y-2"><h3 className="text-overline text-ink-500">{b.payPanel.proof}</h3>
              {sel.proof ? (
                <div className="flex min-w-0 items-center gap-3 rounded-[5.75px] border border-border-soft p-2">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[3.45px] bg-olive-100 text-olive-700">{sel.proof.url ? <img src={sel.proof.url} alt={sel.proof.name} className="h-full w-full object-cover" /> : <FileText className="h-6 w-6" aria-hidden />}</div>
                  <TruncatedText text={sel.proof.name} className="text-[14px] text-ink-900" />
                </div>
              ) : <p className="text-[14px] text-ink-500">{b.payPanel.noProof}</p>}
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}

/* ---------- Reconciliation ---------- */
function ReconcileView({ data }: { data: ReturnType<typeof useData<PaymentRow[]>> }) {
  const r = b.rec;
  const [f, setF] = useState<"unmatched" | "matched" | "all">("unmatched");
  const [matching, setMatching] = useState<PaymentRow | null>(null);
  const all = (data.data ?? []).filter((p) => p.status === "cleared" || p.status === "pending");
  const isMatched = (p: PaymentRow) => !!p.tenantId && !!p.invoiceId;
  const rows = all.filter((p) => f === "all" || (f === "matched" ? isMatched(p) : !isMatched(p)));
  const columns: Column<PaymentRow>[] = [
    { key: "d", header: b.cols.date, render: (p) => <span className="text-ink-500">{formatDate(p.date)}</span> },
    { key: "ref", header: b.cols.ref, render: (p) => <TruncatedText text={p.ref} className="block max-w-[220px] font-medium text-ink-900" /> },
    { key: "src", header: b.cols.method, render: (p) => <span className="text-ink-500">{b.payPanel.source[p.source]}</span> },
    { key: "a", header: b.cols.amount, className: "text-right", render: (p) => <Money v={p.amount} className="font-medium" /> },
    { key: "m", header: b.cols.matched, render: (p) => isMatched(p) ? <TruncatedText text={`${p.tenantName} · ${p.invoiceNumber}`} className="block max-w-[220px] text-ink-500" /> : <StatusChip tone="warning" dot>{r.unmatched}</StatusChip> },
    { key: "x", header: "", render: (p) => !isMatched(p) ? <PillButton size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setMatching(p); }} icon={<Link2 className="h-3.5 w-3.5" />}>{r.match}</PillButton> : null },
  ];
  const card = (p: PaymentRow) => (
    <div className="space-y-2">
      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><TruncatedText text={p.ref} className="font-medium text-ink-900" /><span className="text-[12px] text-ink-500">{formatDate(p.date)} · {b.payPanel.source[p.source]}</span></div><Money v={p.amount} className="font-medium" /></div>
      {isMatched(p) ? <TruncatedText text={`${p.tenantName} · ${p.invoiceNumber}`} className="text-[12px] text-ink-500" /> : <PillButton size="sm" variant="secondary" onClick={() => setMatching(p)} icon={<Link2 className="h-3.5 w-3.5" />}>{r.match}</PillButton>}
    </div>
  );
  return (
    <div className="space-y-4">
      <GlassCard hover={false} className="flex flex-wrap items-center gap-2 p-3 md:p-4">
        <div className="min-w-0 basis-full sm:basis-auto"><h2 className="text-h3 text-ink-900">{r.title}</h2><p className="text-[13px] text-ink-500">{r.sub}</p></div>
        <SegmentedChips label={r.title} value={f} onChange={setF} options={[{ value: "unmatched" as const, label: r.unmatched, count: all.filter((p) => !isMatched(p)).length }, { value: "matched" as const, label: r.matched }, { value: "all" as const, label: r.all }]} />
        <PillButton className="ml-auto" variant="secondary" size="sm" onClick={() => downloadCsv("reconciliation", [["Date", "Reference", "Source", "Amount", "Tenant", "Invoice"], ...rows.map((p) => [p.date, p.ref, b.payPanel.source[p.source], p.amount.toFixed(2), p.tenantName, p.invoiceNumber ?? ""])])} icon={<Download className="h-3.5 w-3.5" />}>{b.export}</PillButton>
      </GlassCard>
      {data.error ? <ErrorCard onRetry={data.reload} /> : (
        <GlassCard hover={false} className="p-3 md:p-4">
          <DataTable rows={rows} columns={columns} loading={data.loading} caption={r.title} card={card} empty={<EmptyState icon={<Link2 className="h-6 w-6" />} title={r.allMatched} body={r.allMatchedBody} />} />
        </GlassCard>
      )}
      {matching && <MatchModal p={matching} onClose={() => setMatching(null)} />}
    </div>
  );
}

function MatchModal({ p, onClose }: { p: PaymentRow; onClose: () => void }) {
  const tenants = useData(() => tenantService.list(), []);
  const invs = useData(() => billingService.invoices(), []);
  const [tenantId, setTenantId] = useState(p.tenantId ?? "");
  const [invoiceId, setInvoiceId] = useState("");
  const [err, setErr] = useState("");
  const openInv = useMemo(() => (invs.data ?? []).filter((i) => i.tenantId === tenantId && i.outstanding > 0), [invs.data, tenantId]);
  const save = async () => {
    if (!tenantId) { setErr(b.capture.errs.tenant); return; }
    await billingService.match(p.id, tenantId, invoiceId || undefined);
    toast.success(b.rec.matchedOk); onClose();
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={fill(b.rec.matchTitle, { ref: p.ref })}
      footer={<><PillButton variant="secondary" onClick={onClose}>{t.common.cancel}</PillButton><PillButton onClick={save}>{b.rec.match}</PillButton></>}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-[5.75px] bg-olive-100 p-3 text-[14px]"><span className="text-ink-500">{formatDate(p.date)}</span><Money v={p.amount} className="font-semibold text-ink-900" /></div>
        <SelectField label={b.capture.tenant} value={tenantId} error={err} onChange={(e) => { setTenantId(e.target.value); setInvoiceId(""); setErr(""); }}><option value="">{b.create.pickTenant}</option>{(tenants.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectField>
        <SelectField label={b.capture.invoice} value={invoiceId} disabled={!tenantId} onChange={(e) => setInvoiceId(e.target.value)}><option value="">{b.capture.none}</option>{openInv.map((i) => <option key={i.id} value={i.id}>{`${i.number} · ${formatZAR(i.outstanding)}`}</option>)}</SelectField>
      </div>
    </Modal>
  );
}

