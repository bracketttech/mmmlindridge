import { useRef, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { FileText, Lock, Paperclip, X } from "lucide-react";
import { CHANNELS, type Channel, type InvoiceStatus, type PayStatus } from "@/mocks/billing";
import { billingService, type InvoiceView, type Proof, type StatementLine } from "@/services";
import { PillButton, StatusChip, TruncatedText, type Tone } from "@/components/nestly/primitives";
import { Modal } from "@/components/nestly/composites";
import { ChipMultiSelect } from "@/components/nestly/forms";
import { Logo } from "@/components/nestly/logo";
import { fill, imageFileToDataUrl } from "@/components/nestly/properties/shared";
import { fmtSize } from "@/components/nestly/requests/shared";
import { validateProof, type Bucket } from "@/lib/billing-rules";
import { formatCompactZAR, formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

export const b = t.bill;
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const nTenants = (n: number) => fill(n === 1 ? b.kpi.tenantOne : b.kpi.tenants, { n });
export const nPayments = (n: number) => fill(n === 1 ? b.kpi.paymentOne : b.kpi.payments, { n });
export const gatewayNote = () => fill(b.gatewayNote, { gateway: b.gateway });

const INV_TONE: Record<InvoiceStatus, Tone> = { draft: "neutral", sent: "info", partial: "warning", paid: "success", overdue: "danger", void: "neutral" };
const PAY_TONE: Record<PayStatus, Tone> = { cleared: "success", pending: "warning", failed: "danger", reversed: "neutral" };
export const InvStatusChip = ({ s }: { s: InvoiceStatus }) => <StatusChip tone={INV_TONE[s]} dot>{b.statuses[s]}</StatusChip>;
export const PayStatusChip = ({ s }: { s: PayStatus }) => <StatusChip tone={PAY_TONE[s]} dot>{b.payStatuses[s]}</StatusChip>;
export const Money = ({ v, className }: { v: number; className?: string }) => <span className={cn("whitespace-nowrap tabular-nums", className)}>{formatZAR(v)}</span>;

/** "Nestly does not hold your funds" line shown on every pay screen and invoice message. */
export function GatewayNote({ className }: { className?: string }) {
  return <p className={cn("flex items-start gap-1.5 text-[12px] text-ink-500", className)}><Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />{gatewayNote()}</p>;
}

/** Client-side CSV download for export buttons. */
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${todayIso()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast.success(b.exported);
}

/* ---------- Paper documents (PDF-style) ---------- */
const Paper = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <article className={cn("min-w-0 rounded-[3.45px] border border-border-soft bg-surface-solid p-5 text-[13px] text-ink-900 shadow-soft sm:p-7", className)}>{children}</article>
);
const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
  <div className={cn("flex items-center justify-between gap-4 py-1", strong && "border-t border-ink-900/20 pt-2 text-[15px] font-semibold")}><span className={strong ? "" : "text-ink-500"}>{k}</span><span className="tabular-nums">{v}</span></div>
);

export function InvoiceDocument({ inv, place, email }: { inv: Pick<InvoiceView, "number" | "issueDate" | "dueDate" | "lines" | "vat" | "subtotal" | "vatAmount" | "total" | "paid" | "outstanding" | "tenantName" | "note"> & { status?: InvoiceStatus | undefined }; place: string; email?: string | undefined }) {
  const d = b.doc;
  return (
    <Paper>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border-soft pb-4">
        <div className="min-w-0 space-y-1"><Logo /><p className="text-ink-500">{d.landlord}</p><p className="text-[12px] text-ink-500">{d.landlordAddr}</p>{inv.vat && <p className="text-[12px] text-ink-500">{d.vatNo}</p>}</div>
        <div className="text-right"><p className="text-h3 uppercase">{inv.vat ? d.taxInvoice : d.invoice}</p><p className="tabular-nums text-ink-500">{inv.number}</p>{inv.status && <div className="mt-1"><InvStatusChip s={inv.status} /></div>}</div>
      </header>
      <section className="grid gap-4 py-4 sm:grid-cols-2">
        <div className="min-w-0"><p className="text-overline text-ink-500">{d.billTo}</p><TruncatedText text={inv.tenantName} className="font-medium" /><TruncatedText text={place} className="text-ink-500" />{email && <TruncatedText text={email} className="text-ink-500" />}</div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 sm:text-right">
          <dt className="text-ink-500">{d.issued}</dt><dd>{formatDate(inv.issueDate)}</dd>
          <dt className="text-ink-500">{d.due}</dt><dd className="font-medium">{formatDate(inv.dueDate)}</dd>
        </dl>
      </section>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[340px] text-left">
          <thead><tr className="border-b border-border-soft text-overline text-ink-500"><th className="py-2 pr-2 font-medium">{d.desc}</th><th className="px-2 py-2 text-right font-medium">{d.qty}</th><th className="px-2 py-2 text-right font-medium">{d.price}</th><th className="py-2 pl-2 text-right font-medium">{d.amount}</th></tr></thead>
          <tbody>
            {inv.lines.map((l) => (
              <tr key={l.id} className="border-b border-border-soft align-top">
                <td className="max-w-[220px] py-2 pr-2"><TruncatedText text={l.description || b.kindDefaults[l.kind]} lines={2} /><span className="text-[11px] text-ink-500">{b.kinds[l.kind]}</span></td>
                <td className="px-2 py-2 text-right tabular-nums">{l.qty}</td>
                <td className="px-2 py-2 text-right"><Money v={l.unitPrice} /></td>
                <td className="py-2 pl-2 text-right"><Money v={l.qty * l.unitPrice} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ml-auto mt-3 max-w-xs">
        <Row k={d.subtotal} v={formatZAR(inv.subtotal)} />
        {inv.vat && <Row k={d.vat} v={formatZAR(inv.vatAmount)} />}
        <Row k={d.total} v={formatZAR(inv.total)} strong />
        {inv.paid > 0 && <Row k={d.paid} v={`− ${formatZAR(inv.paid)}`} />}
        {inv.paid > 0 && <Row k={d.balance} v={formatZAR(inv.outstanding)} strong />}
      </div>
      {inv.note && <p className="mt-4 whitespace-pre-wrap break-words rounded-[3.45px] bg-olive-100 p-3">{inv.note}</p>}
      <footer className="mt-5 space-y-1.5 border-t border-border-soft pt-4 text-[12px] text-ink-500">
        <p className="font-medium text-ink-900">{d.howToPay}</p>
        <p className="break-words">{fill(d.eft, { ref: inv.number })}</p>
        <p>{d.online}</p>
        <GatewayNote />
      </footer>
    </Paper>
  );
}

export function StatementDocument({ name, place, from, to, st }: { name: string; place: string; from: string; to: string; st: { opening: number; lines: StatementLine[]; invoiced: number; paid: number; closing: number } }) {
  const s = b.st;
  return (
    <Paper>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border-soft pb-4">
        <div className="min-w-0 space-y-1"><Logo /><p className="text-ink-500">{b.doc.landlord}</p></div>
        <div className="min-w-0 text-right"><p className="text-h3 uppercase">{s.title}</p><p className="text-ink-500">{fill(s.period, { from: formatDate(from), to: formatDate(to) })}</p></div>
      </header>
      <div className="py-3"><TruncatedText text={name} className="font-medium" /><TruncatedText text={place} className="text-ink-500" /></div>
      <StatementTable st={st} />
    </Paper>
  );
}

export function StatementTable({ st }: { st: { opening: number; lines: StatementLine[]; invoiced: number; paid: number; closing: number } }) {
  const s = b.st;
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border-soft text-[13px] sm:hidden" aria-label={s.title}>
        <li className="flex justify-between gap-3 py-2 text-ink-500"><span>{s.opening}</span><Money v={st.opening} /></li>
        {st.lines.map((l) => (
          <li key={l.id} className="flex min-w-0 items-start justify-between gap-3 py-2">
            <div className="min-w-0"><TruncatedText text={l.ref} className="font-medium text-ink-900" /><span className="text-[12px] text-ink-500">{formatDate(l.date)}</span></div>
            <div className="shrink-0 text-right">{l.debit ? <Money v={l.debit} className="block text-ink-900" /> : <Money v={-l.credit} className="block text-success" />}<span className="text-[12px] text-ink-500">{s.balance} {formatZAR(l.balance)}</span></div>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[520px] text-left text-[13px]">
          <thead><tr className="border-b border-border-soft text-overline text-ink-500"><th className="py-2 pr-2 font-medium">{b.cols.date}</th><th className="px-2 py-2 font-medium">{b.cols.ref}</th><th className="px-2 py-2 text-right font-medium">{s.debit}</th><th className="px-2 py-2 text-right font-medium">{s.credit}</th><th className="py-2 pl-2 text-right font-medium">{s.balance}</th></tr></thead>
          <tbody>
            <tr className="border-b border-border-soft text-ink-500"><td className="py-2 pr-2" colSpan={4}>{s.opening}</td><td className="py-2 pl-2 text-right"><Money v={st.opening} /></td></tr>
            {st.lines.map((l) => (
              <tr key={l.id} className="border-b border-border-soft">
                <td className="whitespace-nowrap py-2 pr-2">{formatDate(l.date)}</td>
                <td className="max-w-[200px] px-2 py-2"><TruncatedText text={l.ref} className="font-medium" /><TruncatedText text={l.kind === "payment" ? fill(s.payment, { method: b.methods[l.description as keyof typeof b.methods] ?? l.description }) : l.description} className="text-[11px] text-ink-500" /></td>
                <td className="px-2 py-2 text-right">{l.debit ? <Money v={l.debit} /> : ""}</td>
                <td className="px-2 py-2 text-right">{l.credit ? <Money v={l.credit} className="text-success" /> : ""}</td>
                <td className="py-2 pl-2 text-right font-medium"><Money v={l.balance} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ml-auto max-w-xs">
        <Row k={s.invoiced} v={formatZAR(st.invoiced)} />
        <Row k={s.paid} v={`− ${formatZAR(st.paid)}`} />
        <Row k={s.closing} v={formatZAR(st.closing)} strong />
      </div>
      <p className="text-right text-[12px] text-ink-500">{fill(s.reconciles, { opening: formatZAR(st.opening), invoiced: formatZAR(st.invoiced), paid: formatZAR(st.paid), closing: formatZAR(st.closing) })}</p>
    </div>
  );
}

/* ---------- Send invoice dialog (mock) ---------- */
export function SendInvoiceDialog({ open, onOpenChange, inv, onSent }: { open: boolean; onOpenChange: (o: boolean) => void; inv: Pick<InvoiceView, "id" | "number" | "tenantName" | "total" | "outstanding" | "dueDate" | "sentAt">; onSent?: () => void }) {
  const s = b.send;
  const [ch, setCh] = useState<Channel[]>(["email", "inapp"]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const vals = { name: inv.tenantName.split(" ")[0] ?? inv.tenantName, number: inv.number, amount: formatZAR(inv.sentAt ? inv.outstanding : inv.total), date: formatDate(inv.dueDate), link: `nestly.co.za/pay/${inv.number.toLowerCase()}`, landlord: b.doc.landlord };
  const submit = async () => {
    if (!ch.length) { setErr(s.pick); return; }
    setBusy(true);
    try { await billingService.send(inv.id, ch); toast.success(fill(s.sent, { channels: ch.map((c) => b.channels[c]).join(", ") })); onOpenChange(false); onSent?.(); }
    catch { toast.error(t.common.errorBody); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={fill(s.title, { number: inv.number })} wide
      footer={<><PillButton variant="secondary" onClick={() => onOpenChange(false)}>{t.common.cancel}</PillButton><PillButton onClick={submit} disabled={busy}>{busy ? t.common.working : s.submit}</PillButton></>}>
      <div className="space-y-4">
        <div className="space-y-2"><p className="text-[14px] font-medium text-ink-900">{s.channels}</p>
          <ChipMultiSelect label={s.channels} value={ch} onChange={(v) => { setCh(v); setErr(""); }} options={CHANNELS.map((c) => ({ value: c, label: b.channels[c] }))} />
          {err && <p role="alert" className="text-[13px] text-danger">{err}</p>}
        </div>
        <div className="space-y-2">
          <p className="text-overline text-ink-500">{s.preview}</p>
          {(ch.includes("email") || ch.includes("inapp") || !ch.length) && (
            <div className="space-y-2 rounded-[5.75px] border border-border-soft bg-olive-100/60 p-4 text-[14px] text-ink-900">
              <p className="font-medium break-words">{fill(s.subject, vals)}</p>
              <p className="break-words">{fill(s.body, vals)}</p>
              <GatewayNote />
            </div>
          )}
          {(ch.includes("whatsapp") || ch.includes("sms")) && (
            <div className="max-w-sm space-y-1 rounded-[5.75px] bg-olive-700 p-3 text-[13px] text-primary-foreground">
              <p className="break-words">{fill(s.sms, vals)}</p>
              <p className="text-[11px] opacity-90">{gatewayNote()}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Arrears ageing chart ---------- */
type AgeDatum = { label: string; amount: number; tenants: number };
function AgeTip({ active, payload }: { active?: boolean; payload?: { payload: AgeDatum }[] }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return <div className="rounded-[3.45px] bg-olive-900 px-3 py-2 text-[12px] text-primary-foreground shadow-soft"><div className="font-medium">{p.label}</div><div className="tabular-nums">{fill(b.arrears.tip, { n: p.tenants, who: p.tenants === 1 ? b.arrears.tenantOne : b.arrears.tenantMany, amount: formatZAR(p.amount) })}</div></div>;
}
export function AgeingChart({ buckets }: { buckets: { bucket: Bucket; amount: number; tenants: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const data: AgeDatum[] = buckets.map((x) => ({ label: b.arrears.buckets[x.bucket], amount: x.amount, tenants: x.tenants }));
  const fills = ["var(--olive-500)", "var(--warning)", "var(--olive-800)", "var(--danger)"];
  return (
    <div className="h-52 w-full" role="img" aria-label={`${b.arrears.chartTitle}: ${data.map((d) => `${d.label} ${formatZAR(d.amount)}`).join(", ")}`}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} onMouseLeave={() => setActive(null)}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-500)", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: "var(--ink-500)", fontSize: 11 }} tickFormatter={(v: number) => formatCompactZAR(v)} />
          <RTooltip cursor={false} content={<AgeTip />} />
          <Bar dataKey="amount" radius={[3, 3, 3, 3]} barSize={34} onMouseEnter={(_, i) => setActive(i)} onClick={(_, i) => setActive(i)}>
            {data.map((_, i) => <Cell key={i} fill={fills[i]} fillOpacity={active === null || active === i ? 1 : 0.55} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- Proof of payment picker ---------- */
export function ProofPicker({ value, onChange }: { value: Proof | null; onChange: (p: Proof | null) => void }) {
  const c = b.capture;
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  const pick = async (f?: File) => {
    if (ref.current) ref.current.value = "";
    if (!f) return;
    const e = validateProof(f);
    if (e) { setErr(fill(e === "type" ? c.proofType : c.proofSize, { name: f.name })); return; }
    setErr("");
    const url = f.type.startsWith("image/") ? await imageFileToDataUrl(f, 640, 0.7).catch(() => undefined) : undefined;
    onChange({ name: f.name, size: f.size, type: f.type, url });
  };
  return (
    <div className="space-y-2">
      <p className="text-[14px] font-medium text-ink-900">{c.proof}</p>
      {value ? (
        <div className="flex min-w-0 items-center gap-3 rounded-[5.75px] border border-border-soft bg-surface-solid p-2">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[3.45px] bg-olive-100 text-olive-700">{value.url ? <img src={value.url} alt={value.name} className="h-full w-full object-cover" /> : <FileText className="h-6 w-6" aria-hidden />}</div>
          <div className="min-w-0 flex-1"><TruncatedText text={value.name} className="text-[14px] text-ink-900" /><span className="text-[12px] text-ink-500">{fmtSize(value.size)}</span></div>
          <button type="button" aria-label={c.proofRemove} onClick={() => onChange(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-olive-100"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <PillButton type="button" variant="secondary" size="sm" onClick={() => ref.current?.click()} icon={<Paperclip className="h-3.5 w-3.5" />}>{c.proofAdd}</PillButton>
      )}
      <input ref={ref} type="file" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e.target.files?.[0])} />
      {err ? <p role="alert" className="text-[13px] text-danger">{err}</p> : <p className="text-[12px] text-ink-500">{c.proofHint}</p>}
    </div>
  );
}

export const ErrorText = ({ children }: { children?: string | undefined }) => (children ? <p role="alert" className="text-[13px] text-danger">{children}</p> : null);
