import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, Plus, Trash2 } from "lucide-react";
import { CHARGE_KINDS, type ChargeKind } from "@/mocks/billing";
import { billingService, tenantService, type InvoiceLine } from "@/services";
import { GlassCard, PageHeader, PillButton } from "@/components/nestly/primitives";
import { SelectField, TextAreaField, ToggleRow } from "@/components/nestly/forms";
import { TextField } from "@/components/nestly/auth";
import { Placeholder } from "@/components/nestly/Placeholder";
import { fill } from "@/components/nestly/properties/shared";
import { useUnitDirectory } from "@/components/nestly/tenants/shared";
import { b, ErrorText, InvoiceDocument, Money, SendInvoiceDialog, todayIso } from "@/components/nestly/billing/shared";
import { invoiceTotals, nextInvoiceDates } from "@/lib/billing-rules";
import { useAppState } from "@/lib/app-state";
import { useData } from "@/lib/use-data";
import { formatDate } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";

export const Route = createFileRoute("/_shell/invoices_/new")({
  head: () => pageHead("New invoice", "Create a rent invoice with extra charges, VAT and an optional monthly schedule."),
  component: NewInvoicePage,
});

const c = b.create;
let seq = 0;
const lineId = () => `nl${Date.now().toString(36)}${seq++}`;
type Draft = { id: string; kind: ChargeKind; description: string; qty: string; unitPrice: string };
const num = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));
const firstOfNext = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString("en-CA"); };

function NewInvoicePage() {
  const { role } = useAppState();
  const navigate = useNavigate();
  const tenants = useData(() => tenantService.list(), []);
  const dir = useUnitDirectory();
  const [tenantId, setTenantId] = useState("");
  const [issue, setIssue] = useState(todayIso());
  const [due, setDue] = useState(firstOfNext());
  const [lines, setLines] = useState<Draft[]>([]);
  const [vat, setVat] = useState(false);
  const [note, setNote] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [day, setDay] = useState("1");
  const [start, setStart] = useState(firstOfNext());
  const [end, setEnd] = useState("");
  const [errs, setErrs] = useState<Partial<Record<"tenant" | "lines" | "due" | "day", string>> & { line?: Record<string, { desc?: string; amount?: string }> }>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; number: string } | null>(null);

  const x = tenants.data?.find((y) => y.id === tenantId);
  const parsed: InvoiceLine[] = lines.map((l) => ({ id: l.id, kind: l.kind, description: l.description.trim(), qty: Math.max(1, Math.round(num(l.qty) || 1)), unitPrice: num(l.unitPrice) || 0 }));
  const totals = invoiceTotals(parsed, vat);
  const dates = useMemo(() => (recurring && Number(day) >= 1 && Number(day) <= 31 && start ? nextInvoiceDates(start, Number(day), todayIso(), 3, end || undefined) : []), [recurring, day, start, end]);

  if (role !== "owner" && role !== "finance") return <Placeholder navKey="invoices" title={c.title} muted={c.muted} />;

  const pickTenant = (id: string) => {
    setTenantId(id);
    const y = tenants.data?.find((z) => z.id === id);
    if (y && !lines.some((l) => l.kind === "rent")) setLines((ls) => [{ id: lineId(), kind: "rent", description: `${b.kinds.rent} — ${new Date(due).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}`, qty: "1", unitPrice: String(y.rent) }, ...ls]);
  };
  const addLine = (kind: ChargeKind) => setLines((ls) => [...ls, { id: lineId(), kind, description: b.kindDefaults[kind], qty: "1", unitPrice: kind === "rent" && x ? String(x.rent) : kind === "deposit" && x ? String(x.deposit) : "" }]);
  const patch = (id: string, p: Partial<Draft>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));

  const save = async (send: boolean) => {
    const e: typeof errs = { line: {} };
    if (!tenantId) e.tenant = c.errs.tenant;
    if (!parsed.length || totals.subtotal <= 0) e.lines = c.errs.lines;
    parsed.forEach((l) => { const le: { desc?: string; amount?: string } = {}; if (!l.description) le.desc = c.errs.desc; if (!(l.unitPrice > 0)) le.amount = c.errs.amount; if (le.desc || le.amount) e.line![l.id] = le; });
    if (due < issue) e.due = c.errs.due;
    if (recurring && !(Number(day) >= 1 && Number(day) <= 31)) e.day = c.errs.day;
    const hasLineErr = Object.keys(e.line!).length > 0;
    if (!hasLineErr) delete e.line;
    setErrs(e);
    if (e.tenant || e.lines || e.due || e.day || hasLineErr) { toast.error(t.common.errorTitle); return; }
    setBusy(true);
    try {
      const id = await billingService.createInvoice({ tenantId, issueDate: issue, dueDate: due, lines: parsed, vat, note: note.trim() || undefined, send: false, channels: [], schedule: recurring ? { dayOfMonth: Number(day), startDate: start, endDate: end || undefined } : undefined });
      toast.success(c.created);
      if (send) { const inv = await billingService.invoice(id); setCreated({ id, number: inv?.number ?? "" }); }
      else navigate({ to: "/invoices", search: { id } });
    } catch { toast.error(t.common.errorBody); } finally { setBusy(false); }
  };

  const preview = { number: "INV-…", issueDate: issue, dueDate: due, lines: parsed.filter((l) => l.unitPrice > 0), vat, subtotal: totals.subtotal, vatAmount: totals.vat, total: totals.total, paid: 0, outstanding: totals.total, tenantName: x?.name ?? "—", note: note.trim() || undefined };

  return (
    <div className="space-y-6">
      <Link to="/invoices" className="inline-flex items-center gap-1.5 rounded-full text-[14px] font-medium text-ink-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" />{t.common.back}</Link>
      <PageHeader title={c.title} muted={c.muted} sub={c.sub} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        <div className="min-w-0 space-y-4">
          <GlassCard hover={false} className="grid gap-4 p-4 sm:grid-cols-2 md:p-5">
            <div className="sm:col-span-2"><SelectField label={c.tenant} value={tenantId} error={errs.tenant} onChange={(e) => pickTenant(e.target.value)}><option value="">{c.pickTenant}</option>{(tenants.data ?? []).map((y) => <option key={y.id} value={y.id}>{`${y.name} — ${dir.place(y)}`}</option>)}</SelectField></div>
            <TextField label={c.issue} type="date" value={issue} onChange={(e) => setIssue(e.target.value)} />
            <TextField label={c.due} type="date" value={due} min={issue} error={errs.due} onChange={(e) => setDue(e.target.value)} />
          </GlassCard>

          <GlassCard hover={false} className="space-y-3 p-4 md:p-5">
            <h2 className="text-h3 text-ink-900">{c.lines}</h2>
            {lines.length > 0 && (
              <ul className="space-y-3">
                {lines.map((l) => {
                  const le = errs.line?.[l.id];
                  return (
                    <li key={l.id} className="grid gap-2 rounded-[5.75px] border border-border-soft bg-surface-solid/80 p-3 sm:grid-cols-[140px_minmax(0,1fr)_70px_130px_auto] sm:items-start">
                      <SelectField label={c.kind} value={l.kind} onChange={(e) => patch(l.id, { kind: e.target.value as ChargeKind })}>{CHARGE_KINDS.map((k) => <option key={k} value={k}>{b.kinds[k]}</option>)}</SelectField>
                      <TextField label={c.desc} value={l.description} error={le?.desc} onChange={(e) => patch(l.id, { description: e.target.value })} />
                      <TextField label={c.qty} inputMode="numeric" value={l.qty} onChange={(e) => patch(l.id, { qty: e.target.value })} />
                      <TextField label={c.price} inputMode="decimal" value={l.unitPrice} error={le?.amount} onChange={(e) => patch(l.id, { unitPrice: e.target.value })} />
                      <button type="button" aria-label={fill(c.removeLine, { name: l.description || b.kinds[l.kind] })} onClick={() => setLines((ls) => ls.filter((y) => y.id !== l.id))} className="grid h-11 w-11 place-items-center justify-self-end rounded-full text-ink-500 hover:bg-olive-100 sm:mt-7"><Trash2 className="h-4 w-4" /></button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex flex-wrap gap-2" role="group" aria-label={c.addLine}>
              {CHARGE_KINDS.map((k) => <button key={k} type="button" onClick={() => addLine(k)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border-soft bg-surface-solid px-3 text-[13px] font-medium text-ink-900 hover:bg-olive-100"><Plus className="h-3.5 w-3.5" aria-hidden />{b.kinds[k]}</button>)}
            </div>
            <ErrorText>{errs.lines}</ErrorText>
            <ToggleRow label={c.vat} hint={c.vatHint} checked={vat} onChange={setVat} />
            <dl className="ml-auto max-w-xs space-y-1 text-[14px]" aria-live="polite">
              <div className="flex justify-between gap-4"><dt className="text-ink-500">{b.doc.subtotal}</dt><dd><Money v={totals.subtotal} /></dd></div>
              {vat && <div className="flex justify-between gap-4"><dt className="text-ink-500">{b.doc.vat}</dt><dd><Money v={totals.vat} /></dd></div>}
              <div className="flex justify-between gap-4 border-t border-border-soft pt-1 text-[16px] font-semibold"><dt>{b.doc.total}</dt><dd><Money v={totals.total} /></dd></div>
            </dl>
          </GlassCard>

          <GlassCard hover={false} className="space-y-4 p-4 md:p-5">
            <ToggleRow label={c.recurring} hint={c.recurringHint} checked={recurring} onChange={setRecurring} />
            {recurring && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField label={c.day} type="number" min={1} max={31} value={day} error={errs.day} onChange={(e) => setDay(e.target.value)} />
                  <TextField label={c.start} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                  <TextField label={c.end} type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <p className="text-overline text-ink-500">{c.nextDates}</p>
                  <ol className="grid gap-2 sm:grid-cols-3">
                    {dates.map((d) => <li key={d} className="flex items-center gap-2 rounded-[5.75px] bg-olive-100 px-3 py-2.5 text-[14px] font-medium text-ink-900"><CalendarDays className="h-4 w-4 text-olive-700" aria-hidden />{formatDate(d)}</li>)}
                  </ol>
                </div>
              </>
            )}
            <TextAreaField label={c.note} value={note} rows={3} onChange={(e) => setNote(e.target.value)} />
          </GlassCard>

          <div className="flex flex-wrap justify-end gap-2">
            <PillButton variant="secondary" disabled={busy} onClick={() => save(false)}>{c.saveDraft}</PillButton>
            <PillButton disabled={busy} onClick={() => save(true)}>{busy ? t.common.working : c.saveSend}</PillButton>
          </div>
        </div>
        <aside className="min-w-0 space-y-2 xl:sticky xl:top-4 xl:self-start">
          <p className="text-overline text-ink-500">{c.preview}</p>
          <InvoiceDocument inv={preview} place={x ? dir.place(x) : "—"} email={x?.email} />
        </aside>
      </div>
      {created && x && (
        <SendInvoiceDialog open onOpenChange={(o) => { if (!o) navigate({ to: "/invoices", search: { id: created.id } }); }}
          inv={{ id: created.id, number: created.number, tenantName: x.name, total: totals.total, outstanding: totals.total, dueDate: due, sentAt: undefined }} />
      )}
    </div>
  );
}
