import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Building2, Clock, CreditCard, Landmark, Loader2, Lock, ShieldCheck, XCircle, Undo2 } from "lucide-react";
import { billingService } from "@/services";
import { EmptyState, GlassCard, PageHeader, PillButton, Skel, SuccessCheck, TruncatedText } from "@/components/nestly/primitives";
import { TextField } from "@/components/nestly/auth";
import { Placeholder } from "@/components/nestly/Placeholder";
import { fill } from "@/components/nestly/properties/shared";
import { useMyTenant } from "@/components/nestly/requests/TenantRequests";
import { useUnitDirectory } from "@/components/nestly/tenants/shared";
import { b, GatewayNote, Money } from "@/components/nestly/billing/shared";
import { ReceiptDocument } from "@/components/nestly/billing/TenantBilling";
import { cardOutcome, OUTCOMES, TEST_CARDS, type Outcome } from "@/lib/billing-rules";
import { useAppState } from "@/lib/app-state";
import { useData } from "@/lib/use-data";
import { formatDate, formatZAR } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

type Step = "checkout" | "result" | "receipt";
type PaySearch = { step?: Step | undefined; outcome?: Outcome | undefined; pid?: string | undefined };

export const Route = createFileRoute("/_shell/invoices_/$invoiceId/pay")({
  head: () => pageHead("Pay invoice", "Pay your rent securely through the payment gateway.", true),
  validateSearch: (s: Record<string, unknown>): PaySearch => ({
    step: ["checkout", "result", "receipt"].includes(s["step"] as string) ? (s["step"] as Step) : undefined,
    outcome: OUTCOMES.includes(s["outcome"] as Outcome) ? (s["outcome"] as Outcome) : undefined,
    pid: typeof s["pid"] === "string" && s["pid"] ? s["pid"] : undefined,
  }),
  component: PayPage,
});

const p = b.pay;
const BANKS = ["Capitec", "FNB", "Standard Bank", "Absa", "Nedbank", "TymeBank"];

function PayPage() {
  const { role } = useAppState();
  const { invoiceId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/invoices/$invoiceId/pay" });
  const me = useMyTenant();
  const inv = useData(() => billingService.invoice(invoiceId), [invoiceId]);
  const dir = useUnitDirectory();
  const go = (s: PaySearch, replace = false) => navigate({ search: s, replace });

  if (role !== "tenant") return <Placeholder navKey="invoices" title={p.title} muted={p.muted} />;
  const loading = me.loading || inv.loading;
  const invoice = inv.data && me.data && inv.data.tenantId === me.data.id ? inv.data : null;
  const place = me.data ? dir.place(me.data) : "";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {search.step !== "checkout" && <Link to="/invoices" className="inline-flex items-center gap-1.5 rounded-full text-[14px] font-medium text-ink-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" />{p.back}</Link>}
      {loading ? <Skel className="h-80" />
        : inv.error ? <GlassCard hover={false} className="p-4"><EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={inv.reload}>{t.common.retry}</PillButton>} /></GlassCard>
        : !invoice ? <GlassCard hover={false} className="p-4"><EmptyState title={p.notFound} action={<Link to="/invoices" className="text-[14px] font-medium text-olive-700 underline">{p.back}</Link>} /></GlassCard>
        : search.step === "result" && search.outcome ? <Result outcome={search.outcome} pid={search.pid} number={invoice.number} amount={invoice.outstanding} onRetry={() => go({ step: "checkout" }, true)} onReceipt={() => go({ step: "receipt", pid: search.pid })} />
        : search.step === "receipt" && search.pid ? <ReceiptStep pid={search.pid} name={me.data?.name ?? ""} place={place} />
        : invoice.outstanding <= 0 ? <GlassCard hover={false} className="p-4"><EmptyState title={p.nothing} body={fill(p.nothingBody, { number: invoice.number })} action={<Link to="/invoices" className="text-[14px] font-medium text-olive-700 underline">{p.back}</Link>} /></GlassCard>
        : search.step === "checkout" ? <Checkout amount={invoice.outstanding} merchant={place} number={invoice.number}
            onDone={async (o, method) => { const pay = await billingService.checkout(invoice.id, o, method); go({ step: "result", outcome: o, pid: pay?.id }, true); }} />
        : (
          <>
            <PageHeader title={p.title} muted={p.muted} />
            <GlassCard hover={false} className="space-y-4 p-5">
              <h2 className="text-h2 text-ink-900">{p.review}</h2>
              <dl className="divide-y divide-border-soft text-[14px]">
                {[[p.invoice, `${invoice.number} · ${b.cols.due} ${formatDate(invoice.dueDate)}`], [p.for, invoice.lines.map((l) => l.description).join(" · ")], [b.doc.total, formatZAR(invoice.total)], ...(invoice.paid ? [[b.doc.paid, `− ${formatZAR(invoice.paid)}`]] : [])].map(([k, v]) => (
                  <div key={k} className="flex min-w-0 items-center justify-between gap-4 py-2.5"><dt className="shrink-0 text-ink-500">{k}</dt><dd className="min-w-0 text-right"><TruncatedText text={v!} className="text-ink-900" /></dd></div>
                ))}
              </dl>
              <div className="flex items-end justify-between gap-3 rounded-[5.75px] bg-olive-100 p-4"><span className="text-[14px] text-ink-500">{p.amount}</span><Money v={invoice.outstanding} className="text-h2 text-ink-900" /></div>
              <PillButton size="lg" className="w-full justify-between" onClick={() => go({ step: "checkout" })} icon={<Lock className="h-4 w-4" />}>{p.continue}</PillButton>
              <GatewayNote />
            </GlassCard>
          </>
        )}
    </div>
  );
}

/* Hosted checkout placeholder — styled as the gateway's page, not Nestly's. */
function Checkout({ amount, merchant, number, onDone }: { amount: number; merchant: string; number: string; onDone: (o: Outcome, method: "card" | "eft") => Promise<void> }) {
  const c = p.checkout;
  const [tab, setTab] = useState<"card" | "eft">("card");
  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [errs, setErrs] = useState<Partial<Record<"number" | "expiry" | "cvc" | "name", string>>>({});
  const [busy, setBusy] = useState(false);
  const fmtCard = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
  const run = async (o: Outcome, m: "card" | "eft") => { setBusy(true); await new Promise((r) => setTimeout(r, 1400)); await onDone(o, m); };
  const payCard = () => {
    const e: typeof errs = {};
    const o = cardOutcome(card);
    if (o === "invalid") e.number = c.errs.number;
    const [mm, yy] = exp.split("/").map(Number) as [number, number];
    const now = new Date();
    if (!(mm >= 1 && mm <= 12 && yy >= 0) || 2000 + yy < now.getFullYear() || (2000 + yy === now.getFullYear() && mm < now.getMonth() + 1)) e.expiry = c.errs.expiry;
    if (!/^\d{3,4}$/.test(cvc)) e.cvc = c.errs.cvc;
    if (name.trim().length < 2) e.name = c.errs.name;
    setErrs(e);
    if (Object.keys(e).length || o === "invalid") return;
    void run(o, "card");
  };

  return (
    <div className="overflow-hidden rounded-[9.2px] border border-border-soft bg-surface-solid shadow-soft">
      <header className="flex items-center justify-between gap-3 bg-ink-900 px-5 py-4 text-primary-foreground">
        <span className="text-[20px] font-bold lowercase tracking-tight">{b.gateway}</span>
        <span className="inline-flex items-center gap-1.5 text-[13px]"><ShieldCheck className="h-4 w-4" aria-hidden />{c.secure}</span>
      </header>
      <p className="bg-warning/15 px-5 py-2 text-center text-[12px] font-medium text-warning-ink">{c.demo}</p>
      {busy ? (
        <div role="status" className="grid place-items-center gap-3 px-5 py-16 text-center"><Loader2 className="h-10 w-10 animate-spin text-ink-900 motion-reduce:animate-none" aria-hidden /><p className="text-[15px] font-medium text-ink-900">{c.processing}</p></div>
      ) : (
        <div className="space-y-5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><p className="text-[12px] text-ink-500">{fill(c.merchant, { merchant: "Nestly" })}</p><TruncatedText text={`${merchant} · ${number}`} className="text-[13px] text-ink-900" /></div>
            <Money v={amount} className="text-h2 text-ink-900" />
          </div>
          <div role="tablist" aria-label={c.secure} className="grid grid-cols-2 gap-1 rounded-[5.75px] bg-olive-100 p-1">
            {(["card", "eft"] as const).map((k) => (
              <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-[4.6px] text-[14px] font-medium", tab === k ? "bg-surface-solid text-ink-900 shadow-soft" : "text-ink-500")}>
                {k === "card" ? <CreditCard className="h-4 w-4" aria-hidden /> : <Landmark className="h-4 w-4" aria-hidden />}{c[k]}
              </button>
            ))}
          </div>
          {tab === "card" ? (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); payCard(); }} noValidate>
              <TextField label={c.number} inputMode="numeric" autoComplete="cc-number" value={card} error={errs.number} onChange={(e) => setCard(fmtCard(e.target.value))} placeholder="1234 5678 9012 3456" />
              <div className="grid grid-cols-2 gap-3">
                <TextField label={c.expiry} inputMode="numeric" autoComplete="cc-exp" value={exp} error={errs.expiry} onChange={(e) => setExp(fmtExp(e.target.value))} placeholder="MM/YY" />
                <TextField label={c.cvc} inputMode="numeric" autoComplete="cc-csc" value={cvc} error={errs.cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" />
              </div>
              <TextField label={c.name} autoComplete="cc-name" value={name} error={errs.name} onChange={(e) => setName(e.target.value)} />
              <details className="rounded-[5.75px] border border-dashed border-border-soft p-3 text-[13px]">
                <summary className="cursor-pointer font-medium text-ink-900">{c.tests}</summary>
                <ul className="mt-2 space-y-1.5">
                  {(Object.keys(TEST_CARDS) as (keyof typeof TEST_CARDS)[]).map((k) => (
                    <li key={k}><button type="button" onClick={() => { setCard(TEST_CARDS[k]); setExp("12/29"); setCvc("123"); if (!name) setName("T Nkosi"); }} className="flex w-full items-center justify-between gap-3 rounded-[3.45px] px-2 py-1 text-left hover:bg-olive-100"><span className="tabular-nums text-ink-900">{TEST_CARDS[k]}</span><span className="text-ink-500">{c[k === "success" ? "testSuccess" : k === "failed" ? "testFailed" : "testPending"]}</span></button></li>
                  ))}
                </ul>
              </details>
              <button type="submit" className="flex h-14 w-full items-center justify-center gap-2 rounded-[5.75px] bg-ink-900 text-[15px] font-semibold text-primary-foreground hover:opacity-90"><Lock className="h-4 w-4" aria-hidden />{fill(c.payBtn, { amount: formatZAR(amount) })}</button>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-[14px] font-medium text-ink-900">{c.bank}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {BANKS.map((x) => <button key={x} type="button" aria-pressed={bank === x} onClick={() => setBank(x)} className={cn("flex h-14 items-center justify-center gap-2 rounded-[5.75px] border text-[14px] font-medium", bank === x ? "border-ink-900 bg-olive-100 text-ink-900" : "border-border-soft text-ink-900 hover:bg-olive-100")}><Building2 className="h-4 w-4 text-ink-500" aria-hidden /><span className="truncate">{x}</span></button>)}
              </div>
              <button type="button" disabled={!bank} onClick={() => void run("pending", "eft")} className="flex h-14 w-full items-center justify-center gap-2 rounded-[5.75px] bg-ink-900 text-[15px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40">{fill(c.eftBtn, { bank: bank || "…" })}</button>
            </div>
          )}
          <button type="button" onClick={() => void onDone("abandoned", tab)} className="flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[14px] font-medium text-ink-500 hover:text-ink-900"><Undo2 className="h-4 w-4" aria-hidden />{c.cancel}</button>
          <GatewayNote className="justify-center text-center" />
        </div>
      )}
    </div>
  );
}

function Result({ outcome, pid, number, amount, onRetry, onReceipt }: { outcome: Outcome; pid?: string | undefined; number: string; amount: number; onRetry: () => void; onReceipt: () => void }) {
  const pay = useData(() => (pid ? billingService.payment(pid) : Promise.resolve(null)), [pid]);
  const r = p.result[outcome];
  const paid = pay.data?.amount ?? amount;
  const body = fill(r.body, { amount: formatZAR(paid), number, balance: formatZAR(Math.max(0, pay.data?.balance ?? 0)), gateway: b.gateway });
  const Icon = outcome === "failed" ? XCircle : outcome === "pending" ? Clock : Undo2;
  return (
    <GlassCard hover={false} className="space-y-5 p-6 text-center" >
      <div className="flex justify-center" aria-hidden>
        {outcome === "success" ? <SuccessCheck /> : <span className={cn("grid h-20 w-20 place-items-center rounded-full", outcome === "failed" ? "bg-danger/12 text-danger" : outcome === "pending" ? "bg-warning/15 text-warning-ink" : "bg-olive-100 text-olive-700")}><Icon className="h-9 w-9" /></span>}
      </div>
      <div className="space-y-2" role="status">
        <h1 className="text-h1 text-ink-900">{r.title}</h1>
        {pid && pay.loading ? <Skel className="mx-auto h-5 w-2/3" /> : <p className="mx-auto max-w-md text-[15px] text-ink-500">{body}</p>}
        {pay.data && <p className="text-[13px] text-ink-500">{p.ref}: {pay.data.ref}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {(outcome === "failed" || outcome === "abandoned") && <PillButton onClick={onRetry}>{p.retry}</PillButton>}
        {(outcome === "success" || outcome === "pending") && pid && <PillButton onClick={onReceipt}>{p.receipt}</PillButton>}
        <Link to="/invoices" className="inline-flex h-11 items-center rounded-full border border-border-soft bg-surface-solid px-5 text-[14px] font-medium text-ink-900 hover:bg-olive-100">{p.home}</Link>
      </div>
      <GatewayNote className="justify-center" />
    </GlassCard>
  );
}

function ReceiptStep({ pid, name, place }: { pid: string; name: string; place: string }) {
  const pay = useData(() => billingService.payment(pid), [pid]);
  if (pay.loading) return <Skel className="h-96" />;
  if (!pay.data) return <GlassCard hover={false} className="p-4"><EmptyState title={p.notFound} /></GlassCard>;
  return <ReceiptDocument p={pay.data} name={name} place={place} balance={pay.data.balance} />;
}
