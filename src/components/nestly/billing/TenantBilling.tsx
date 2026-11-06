import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Clock, CreditCard, FileDown, Receipt } from "lucide-react";
import { billingService, type InvoiceView, type Payment } from "@/services";
import { EmptyState, GlassCard, PageHeader, PillButton, SegmentedChips, Skel, StatusChip, TruncatedText } from "@/components/nestly/primitives";
import { SidePanel } from "@/components/nestly/overlays";
import { Logo } from "@/components/nestly/logo";
import { fill } from "@/components/nestly/properties/shared";
import { useMyTenant } from "@/components/nestly/requests/TenantRequests";
import { useUnitDirectory } from "@/components/nestly/tenants/shared";
import { useData } from "@/lib/use-data";
import { formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { b, GatewayNote, InvoiceDocument, InvStatusChip, Money, PayStatusChip, StatementTable, todayIso } from "./shared";
import { addMonths } from "@/lib/billing-rules";

type Tab = "invoices" | "statement" | "receipts";
type PayRow = Payment & { invoiceNumber?: string | undefined };

export function useTenantBilling() {
  const me = useMyTenant();
  const data = useData(() => (me.data ? billingService.forTenant(me.data.id) : Promise.resolve(null)), [me.data?.id]);
  return { me, data, loading: me.loading || data.loading };
}

/** Oldest unpaid invoice — what "Pay now" settles first. */
export const nextToPay = (xs: InvoiceView[]) => [...xs].filter((i) => i.outstanding > 0).sort((a, c) => a.dueDate.localeCompare(c.dueDate))[0];

export function TenantBilling() {
  const { me, data, loading } = useTenantBilling();
  const dir = useUnitDirectory();
  const [tab, setTab] = useState<Tab>("invoices");
  const [sel, setSel] = useState<string | null>(null);
  const [rcpt, setRcpt] = useState<string | null>(null);
  const tb = b.tenant;
  const d = data.data;
  const next = d ? nextToPay(d.invoices) : undefined;
  const place = me.data ? dir.place(me.data) : "";
  const inv = d?.invoices.find((i) => i.id === sel) ?? null;
  const pay = d?.payments.find((p) => p.id === rcpt) ?? null;

  if (me.error || data.error) return <div className="space-y-6"><PageHeader title={tb.title} muted={tb.muted} /><GlassCard hover={false} className="p-4"><EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={() => { me.reload(); data.reload(); }}>{t.common.retry}</PillButton>} /></GlassCard></div>;

  return (
    <div className="space-y-6">
      <PageHeader title={tb.title} muted={tb.muted} sub={tb.sub} />
      {loading || !d ? <Skel className="h-48" /> : (
        <section className="relative overflow-hidden rounded-[9.2px] bg-olive-800 p-5 text-primary-foreground shadow-soft md:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="text-overline opacity-90">{tb.balance}</p>
              <p className="text-kpi tabular-nums">{formatZAR(Math.max(0, d.balance))}</p>
              {next ? <p className="text-[14px] opacity-90">{fill(tb.dueOn, { date: formatDate(next.dueDate) })} · {next.number}</p> : <p className="flex items-center gap-1.5 text-[14px] opacity-90"><CheckCircle2 className="h-4 w-4" aria-hidden />{tb.upToDate}</p>}
              {d.pending > 0 && <p className="inline-flex items-center gap-1.5 rounded-full bg-surface-solid/15 px-3 py-1 text-[12px]"><Clock className="h-3.5 w-3.5" aria-hidden />{fill(tb.pendingNote, { amount: formatZAR(d.pending) })}</p>}
            </div>
            {next && (
              <Link to="/invoices/$invoiceId/pay" params={{ invoiceId: next.id }} className="inline-flex h-14 items-center gap-3 rounded-full bg-surface-solid pl-6 pr-2 text-[15px] font-medium text-olive-900 shadow-soft hover:bg-olive-100">
                {tb.payNow} {formatZAR(next.outstanding)}<span className="grid h-10 w-10 place-items-center rounded-full bg-olive-700 text-primary-foreground"><ArrowRight className="h-4 w-4" /></span>
              </Link>
            )}
          </div>
          <p className="mt-4 text-[12px] opacity-90">{fill(b.gatewayNote, { gateway: b.gateway })}</p>
        </section>
      )}
      <SegmentedChips label={tb.title} value={tab} onChange={setTab} options={(["invoices", "statement", "receipts"] as const).map((v) => ({ value: v, label: tb.tabs[v] }))} />
      {loading || !d ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skel key={i} className="h-20" />)}</div>
        : tab === "invoices" ? (
          d.invoices.length === 0 ? <GlassCard hover={false} className="p-4"><EmptyState icon={<Receipt className="h-6 w-6" />} title={tb.noInvoices} /></GlassCard> : (
            <ul className="space-y-2">
              {d.invoices.map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => setSel(i.id)} className={cn("lift flex w-full min-w-0 items-center gap-3 rounded-[8.05px] border border-border-soft bg-surface-solid/85 p-4 text-left", sel === i.id && "bg-olive-100")}>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-olive-100 text-olive-700"><Receipt className="h-5 w-5" aria-hidden /></span>
                    <div className="min-w-0 flex-1"><TruncatedText text={i.lines[0]?.description ?? i.number} className="font-medium text-ink-900" /><span className="text-[12px] text-ink-500">{i.number} · {b.cols.due} {formatDate(i.dueDate)}</span></div>
                    <div className="shrink-0 text-right"><Money v={i.outstanding || i.total} className="block font-medium text-ink-900" /><InvStatusChip s={i.status} /></div>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : tab === "statement" ? <TenantStatement tenantId={me.data!.id} />
        : d.payments.length === 0 ? <GlassCard hover={false} className="p-4"><EmptyState icon={<CreditCard className="h-6 w-6" />} title={tb.noReceipts} /></GlassCard> : (
          <ul className="space-y-2">
            {d.payments.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setRcpt(p.id)} className="flex w-full min-w-0 items-center gap-3 rounded-[8.05px] border border-border-soft bg-surface-solid/85 p-4 text-left hover:bg-olive-100">
                  <div className="min-w-0 flex-1"><TruncatedText text={`${b.methods[p.method]} · ${p.invoiceNumber ?? p.ref}`} className="font-medium text-ink-900" /><span className="text-[12px] text-ink-500">{formatDate(p.date)}</span></div>
                  <div className="shrink-0 text-right"><Money v={p.amount} className="block font-medium text-ink-900" /><PayStatusChip s={p.status} /></div>
                </button>
              </li>
            ))}
          </ul>
        )}
      <GatewayNote />
      <SidePanel open={!!inv} onOpenChange={(o) => !o && setSel(null)} title={inv ? fill(b.panel.title, { number: inv.number }) : ""} wide
        footer={inv && inv.outstanding > 0 ? <Link to="/invoices/$invoiceId/pay" params={{ invoiceId: inv.id }} className="inline-flex h-11 items-center gap-3 rounded-full bg-olive-700 pl-5 pr-1.5 text-[14px] font-medium text-primary-foreground shadow-soft hover:bg-olive-800">{tb.payNow} {formatZAR(inv.outstanding)}<span className="grid h-8 w-8 place-items-center rounded-full bg-surface-solid text-olive-900"><ArrowRight className="h-4 w-4" /></span></Link> : undefined}>
        {inv && <InvoiceDocument inv={inv} place={place} email={me.data?.email} />}
      </SidePanel>
      <SidePanel open={!!pay} onOpenChange={(o) => !o && setRcpt(null)} title={b.pay.rcpt.title}>
        {pay && me.data && <ReceiptDocument p={pay} name={me.data.name} place={place} />}
      </SidePanel>
    </div>
  );
}

function TenantStatement({ tenantId }: { tenantId: string }) {
  const [from, setFrom] = useState(addMonths(`${todayIso().slice(0, 7)}-01`, -3));
  const to = todayIso();
  const st = useData(() => billingService.statement(tenantId, from, to), [tenantId, from]);
  const ranges = [{ v: 3, l: "3 months" }, { v: 6, l: "6 months" }, { v: 12, l: "12 months" }] as const;
  const months = ranges.find((r) => addMonths(`${todayIso().slice(0, 7)}-01`, -r.v) === from)?.v ?? 3;
  return (
    <GlassCard hover={false} className="space-y-4 p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedChips label={b.st.title} value={String(months)} onChange={(v) => setFrom(addMonths(`${todayIso().slice(0, 7)}-01`, -Number(v)))} options={ranges.map((r) => ({ value: String(r.v), label: r.l }))} />
        <PillButton className="ml-auto" size="sm" variant="secondary" onClick={() => toast.info(b.st.downloaded)} icon={<FileDown className="h-3.5 w-3.5" />}>{b.st.download}</PillButton>
      </div>
      {st.loading || !st.data ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skel key={i} className="h-10" />)}</div> : st.error ? <EmptyState tone="error" title={t.common.errorTitle} /> : <StatementTable st={st.data} />}
    </GlassCard>
  );
}

export function ReceiptDocument({ p, name, place, balance }: { p: PayRow; name: string; place: string; balance?: number | undefined }) {
  const r = b.pay.rcpt;
  const rows: [string, React.ReactNode][] = [
    [r.paidBy, <TruncatedText key="n" text={name} />], [r.invoice, p.invoiceNumber ?? "—"], [r.method, b.methods[p.method]], [r.date, formatDate(p.date)], [r.ref, <TruncatedText key="r" text={p.ref} />], [r.status, <PayStatusChip key="s" s={p.status} />],
    ...(balance !== undefined ? [[r.balanceAfter, formatZAR(Math.max(0, balance))] as [string, React.ReactNode]] : []),
  ];
  return (
    <article className="space-y-4 rounded-[3.45px] border border-border-soft bg-surface-solid p-5 text-[14px] text-ink-900 shadow-soft">
      <header className="flex items-center justify-between gap-3 border-b border-border-soft pb-3"><Logo /><StatusChip tone="strong">{r.title}</StatusChip></header>
      <div className="text-center"><p className="text-overline text-ink-500">{r.amount}</p><p className="text-kpi tabular-nums">{formatZAR(p.amount)}</p><TruncatedText text={place} className="text-[13px] text-ink-500" /></div>
      <dl className="divide-y divide-border-soft">{rows.map(([k, v]) => <div key={k} className="flex min-w-0 items-center justify-between gap-4 py-2"><dt className="shrink-0 text-ink-500">{k}</dt><dd className="min-w-0 text-right font-medium">{v}</dd></div>)}</dl>
      <GatewayNote />
      <PillButton variant="secondary" size="sm" onClick={() => toast.info(r.printed)} icon={<FileDown className="h-3.5 w-3.5" />}>{r.print}</PillButton>
    </article>
  );
}
