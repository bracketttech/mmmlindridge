import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bell, CalendarClock, Download, FileSignature, FileText, Plus, Repeat, Search } from "lucide-react";
import { leaseService, signService, templateService, tenantService, type LeaseView, type LeaseInput } from "@/services";
import { EmptyState, GlassCard, PageHeader, PillButton, SegmentedChips, Skel, TruncatedText } from "@/components/nestly/primitives";
import { DataTable, KpiTile, Modal, type Column } from "@/components/nestly/composites";
import { SelectField, TextAreaField, ToggleRow } from "@/components/nestly/forms";
import { TextField } from "@/components/nestly/auth";
import { ConfirmDialog, SidePanel } from "@/components/nestly/overlays";
import { fill } from "@/components/nestly/properties/shared";
import { downloadCsv } from "@/components/nestly/billing/shared";
import { ErrorCard } from "@/components/nestly/billing/OwnerBilling";
import { escalatedRent } from "@/lib/billing-rules";
import { renewIssues, type LeaseDisplay } from "@/lib/leasing-rules";
import { useAppState } from "@/lib/app-state";
import { useData } from "@/lib/use-data";
import { formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { daysLeftLabel, EnvStatusChip, l, LeaseChip, sg, todayIso } from "./shared";
import { SignaturesView } from "./SignaturesView";
import { TemplatesView } from "./TemplatesView";
import { InspectionsView } from "./InspectionsView";

export const LEASE_VIEWS = ["leases", "signatures", "templates", "inspections"] as const;
export type LeaseViewKey = (typeof LEASE_VIEWS)[number];
export type LeaseSearch = { view?: LeaseViewKey | undefined; id?: string | undefined };
export type SetLeaseSearch = (p: Partial<LeaseSearch>, replace?: boolean) => void;

export function OwnerLeases({ view, id, set }: { view: LeaseViewKey; id?: string | undefined; set: SetLeaseSearch }) {
  const { propertyId } = useAppState();
  const leases = useData(() => leaseService.list(propertyId), [propertyId]);
  const envs = useData(() => signService.list(propertyId), [propertyId]);
  const all = leases.data ?? [];
  const count = (d: LeaseDisplay) => all.filter((x) => x.display === d).length;
  const awaiting = (envs.data ?? []).filter((e) => e.status === "sent" || e.status === "viewed").length;
  const live = all.filter((x) => x.display === "active" || x.display === "expiring" || x.display === "month_to_month");
  const loading = leases.loading || envs.loading;
  return (
    <div className="space-y-6">
      <PageHeader title={l.title} muted={l.muted} sub={leases.data ? fill(l.sub, { active: live.length, expiring: count("expiring"), awaiting }) : undefined}
        actions={<Link to="/leases/prepare" className="inline-flex h-11 items-center gap-3 rounded-full bg-olive-700 pl-5 pr-1.5 text-[14px] font-medium text-primary-foreground shadow-soft hover:bg-olive-800">{l.prepare}<span className="grid h-8 w-8 place-items-center rounded-full bg-surface-solid text-olive-900"><FileSignature className="h-4 w-4" /></span></Link>} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiTile loading={loading} label={l.kpi.active} value={String(live.length)} unit="" variant="plain" delta={formatZAR(live.reduce((a, x) => a + x.rent, 0), { decimals: false })} deltaLabel={l.kpi.rentRoll} />
        <KpiTile loading={loading} label={l.kpi.expiring} value={String(count("expiring"))} unit="" variant="tick-bar" visual={[90, 60, 30].map((n) => all.filter((x) => x.display === "expiring" && x.daysLeft <= n).length)} tip={l.renewals.sub} />
        <KpiTile loading={loading} label={l.kpi.m2m} value={String(count("month_to_month"))} unit="" variant="plain" />
        <KpiTile loading={loading} label={l.kpi.awaiting} value={String(awaiting)} unit="" variant="plain" />
      </div>
      <SegmentedChips label={l.title} value={view} onChange={(v) => set({ view: v === "leases" ? undefined : v, id: undefined })} options={LEASE_VIEWS.map((v) => ({ value: v, label: l.views[v] }))} />
      {view === "leases" ? <LeasesList data={leases} id={id} set={set} />
        : view === "signatures" ? <SignaturesView data={envs} id={id} set={set} />
        : view === "templates" ? <TemplatesView />
        : <InspectionsView id={id} set={set} />}
    </div>
  );
}

/* ---------- Leases list ---------- */
type Filter = "all" | LeaseDisplay;
function LeasesList({ data, id, set }: { data: ReturnType<typeof useData<LeaseView[]>>; id?: string | undefined; set: SetLeaseSearch }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<Filter>("all");
  const [form, setForm] = useState<LeaseView | "new" | null>(null);
  const [renew, setRenew] = useState<LeaseView | null>(null);
  const [m2m, setM2m] = useState<LeaseView | null>(null);
  const all = data.data ?? [];
  const rows = all.filter((x) => (f === "all" || x.display === f) && (!q.trim() || `${x.tenantName} ${x.place} ${x.number}`.toLowerCase().includes(q.trim().toLowerCase())));
  const sel = all.find((x) => x.id === id) ?? null;
  const filters: Filter[] = ["all", "active", "expiring", "month_to_month", "draft", "ended"];
  const expiring = all.filter((x) => x.display === "expiring").sort((a, b) => a.daysLeft - b.daysLeft);

  const columns: Column<LeaseView>[] = [
    { key: "t", header: l.cols.tenant, render: (x) => <div className="min-w-0 max-w-[230px]"><TruncatedText text={x.tenantName} className="font-medium text-ink-900" /><TruncatedText text={x.place} className="text-[12px] text-ink-500" /></div> },
    { key: "n", header: l.cols.lease, render: (x) => <span className="tabular-nums text-ink-500">{x.number}</span> },
    { key: "term", header: l.cols.term, render: (x) => <div className="whitespace-nowrap"><span className="text-ink-900">{formatDate(x.start)} – {formatDate(x.end)}</span><p className="text-[12px] text-ink-500">{x.display === "month_to_month" ? fill(l.mtm, { date: formatDate(x.end) }) : x.display === "draft" ? "" : daysLeftLabel(x.daysLeft, x.end)}</p></div> },
    { key: "r", header: l.cols.rent, className: "text-right", render: (x) => <span className="whitespace-nowrap tabular-nums">{formatZAR(x.rent)}</span> },
    { key: "s", header: l.cols.status, render: (x) => <LeaseChip s={x.display} /> },
    { key: "sig", header: l.cols.signature, render: (x) => (x.signature ? <EnvStatusChip s={x.signature.status} /> : <span className="text-ink-500">—</span>) },
  ];
  const card = (x: LeaseView) => (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><TruncatedText text={x.tenantName} className="font-medium text-ink-900" /><TruncatedText text={`${x.number} · ${x.place}`} className="text-[12px] text-ink-500" /></div><LeaseChip s={x.display} /></div>
      <div className="flex items-center justify-between gap-2 text-[13px]"><span className="text-ink-500">{x.display === "month_to_month" ? l.display.month_to_month : x.display === "draft" ? formatDate(x.start) : daysLeftLabel(x.daysLeft, x.end)}</span><span className="font-medium tabular-nums text-ink-900">{formatZAR(x.rent)}</span></div>
    </div>
  );
  const exportCsv = () => downloadCsv("leases", [["Lease", "Tenant", "Property · unit", "Start", "End", "Rent", "Deposit", "Escalation %", "Status"], ...rows.map((x) => [x.number, x.tenantName, x.place, x.start, x.end, x.rent.toFixed(2), x.deposit.toFixed(2), x.escalationPct, l.display[x.display]])]);
  const remind = async (x: LeaseView) => { await leaseService.sendReminder(x.id, "Email"); toast.success(fill(l.renewals.reminded, { name: x.tenantName })); };

  return (
    <div className="space-y-4">
      <GlassCard hover={false} className="space-y-3 p-4 md:p-5">
        <div className="flex items-start gap-3"><CalendarClock className="mt-1 h-5 w-5 shrink-0 text-olive-700" aria-hidden /><div className="min-w-0"><h2 className="text-h3 text-ink-900">{l.renewals.title}</h2><p className="text-[13px] text-ink-500">{l.renewals.sub}</p></div></div>
        {data.loading ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skel key={i} className="h-24" />)}</div>
          : !expiring.length ? <p className="text-[14px] text-ink-500">{l.renewals.none}</p> : (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {expiring.map((x) => (
                <li key={x.id} className="min-w-0 space-y-2 rounded-[5.75px] border border-border-soft bg-surface-solid/80 p-3">
                  <div className="flex items-start gap-2">
                    <button type="button" onClick={() => set({ id: x.id }, false)} className="min-w-0 flex-1 text-left"><TruncatedText text={x.tenantName} className="font-medium text-ink-900" /><TruncatedText text={x.place} className="text-[12px] text-ink-500" /></button>
                    <span className={x.daysLeft <= 30 ? "shrink-0 text-[13px] font-medium text-danger" : "shrink-0 text-[13px] font-medium text-warning-ink"}>{daysLeftLabel(x.daysLeft, x.end)}</span>
                  </div>
                  {x.due.length > 0 && <p className="flex items-center gap-1 text-[12px] text-ink-500"><Bell className="h-3 w-3" aria-hidden />{fill(l.renewals.due, { n: Math.min(...x.due) })}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    <PillButton size="sm" onClick={() => setRenew(x)}>{l.renewals.renew}</PillButton>
                    {x.canMonthToMonth && <PillButton size="sm" variant="secondary" onClick={() => setM2m(x)}>{l.renewals.m2m}</PillButton>}
                    <PillButton size="sm" variant="ghost" onClick={() => remind(x)}>{l.renewals.remind}</PillButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </GlassCard>
      <GlassCard hover={false} className="space-y-3 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative block min-w-0 flex-1 sm:max-w-xs"><span className="sr-only">{l.search}</span><Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={l.search} className="h-11 w-full rounded-[5.75px] border border-input bg-surface-solid pl-9 pr-3 text-[15px] outline-none focus:border-olive-700" /></label>
          <div className="ml-auto flex gap-2"><PillButton variant="secondary" size="sm" onClick={exportCsv} icon={<Download className="h-3.5 w-3.5" />}>{l.export}</PillButton><PillButton size="sm" onClick={() => setForm("new")} icon={<Plus className="h-3.5 w-3.5" />}>{l.newLease}</PillButton></div>
        </div>
        <SegmentedChips wrap label={l.cols.status} value={f} onChange={setF} options={filters.map((s) => ({ value: s, label: s === "all" ? l.all : l.display[s], count: s === "all" ? all.length : all.filter((x) => x.display === s).length }))} />
      </GlassCard>
      {data.error ? <ErrorCard onRetry={data.reload} /> : (
        <GlassCard hover={false} className="p-3 md:p-4">
          <DataTable rows={rows} columns={columns} loading={data.loading} caption={l.views.leases} selectedId={id} onSelect={(i) => set({ id: i }, false)} card={card}
            empty={all.length === 0 ? <EmptyState icon={<FileText className="h-6 w-6" />} title={l.emptyTitle} body={l.emptyBody} action={<PillButton onClick={() => setForm("new")}>{l.newLease}</PillButton>} /> : <EmptyState icon={<Search className="h-6 w-6" />} title={l.zeroTitle} body={l.zeroBody} action={<PillButton variant="secondary" onClick={() => { setQ(""); setF("all"); }}>{l.clear}</PillButton>} />} />
        </GlassCard>
      )}
      <LeasePanel x={sel} onClose={() => set({ id: undefined })} onRenew={setRenew} onM2m={setM2m} onEdit={setForm} set={set} />
      {renew && <RenewModal x={renew} onClose={() => setRenew(null)} />}
      {m2m && <ConfirmDialog open onOpenChange={(o) => !o && setM2m(null)} tone="primary" title={l.panel.m2mTitle} body={fill(l.panel.m2mBody, { name: m2m.tenantName, date: formatDate(m2m.end), n: Math.max(30, m2m.noticeDays) })} confirmLabel={l.panel.m2m}
        onConfirm={async () => { await leaseService.monthToMonth(m2m.id); toast.success(l.panel.m2mDone); }} />}
      {form && <LeaseFormModal x={form === "new" ? null : form} onClose={() => setForm(null)} onCreated={(nid) => set({ id: nid }, false)} />}
    </div>
  );
}

/* ---------- Lease detail ---------- */
function LeasePanel({ x, onClose, onRenew, onM2m, onEdit, set }: { x: LeaseView | null; onClose: () => void; onRenew: (x: LeaseView) => void; onM2m: (x: LeaseView) => void; onEdit: (x: LeaseView) => void; set: SetLeaseSearch }) {
  const p = l.panel;
  const envs = useData(() => (x ? signService.list() : Promise.resolve([])), [x?.id]);
  const [del, setDel] = useState(false);
  const [end, setEnd] = useState(false);
  const docs = (envs.data ?? []).filter((e) => e.leaseId === x?.id);
  const setRem = async (k: keyof LeaseView["reminders"], v: boolean) => { if (x) await leaseService.setReminders(x.id, { ...x.reminders, [k]: v }); };
  return (
    <SidePanel open={!!x} onOpenChange={(o) => !o && onClose()} title={x ? fill(p.title, { number: x.number }) : ""} wide
      footer={x ? <>
        {x.state === "draft" && <PillButton variant="ghost" onClick={() => setDel(true)}>{p.delete}</PillButton>}
        {(x.display === "month_to_month" || x.display === "expiring") && <PillButton variant="ghost" onClick={() => setEnd(true)}>{p.endLease}</PillButton>}
        {x.canMonthToMonth && <PillButton variant="secondary" onClick={() => onM2m(x)}>{p.m2m}</PillButton>}
        {x.state !== "draft" && x.state !== "ended" && <PillButton variant="secondary" onClick={() => onRenew(x)} icon={<Repeat className="h-4 w-4" />}>{p.renew}</PillButton>}
        {x.state === "draft" && <PillButton variant="secondary" onClick={() => onEdit(x)}>{p.edit}</PillButton>}
        <Link to="/leases/prepare" search={{ leaseId: x.id }} className="inline-flex h-11 items-center gap-3 rounded-full bg-olive-700 pl-5 pr-1.5 text-[14px] font-medium text-primary-foreground hover:bg-olive-800">{l.prepare}<span className="grid h-8 w-8 place-items-center rounded-full bg-surface-solid text-olive-900"><FileSignature className="h-4 w-4" /></span></Link>
      </> : undefined}>
      {x && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><TruncatedText text={x.tenantName} className="text-h3 text-ink-900" /><TruncatedText text={x.place} className="text-[13px] text-ink-500" /></div>
            <LeaseChip s={x.display} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-[14px]">
            {([
              [p.start, formatDate(x.start)], [p.end, formatDate(x.end)],
              [p.rent, formatZAR(x.rent)], [p.escalation, `${String(x.escalationPct).replace(".", ",")}% · ${fill(p.nextEsc, { date: formatDate(x.nextEscalation) })}`],
              [p.deposit, formatZAR(x.deposit)], [p.notice, fill(p.noticeDays, { n: x.noticeDays })],
              [p.dueDay, fill(p.dueDayV, { n: x.rentDueDay })], [p.coTenant, x.coTenant || "—"],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="min-w-0"><dt className="text-overline text-ink-500">{k}</dt><dd><TruncatedText text={v} className="text-ink-900" /></dd></div>
            ))}
          </dl>
          <section className="space-y-2"><h3 className="text-overline text-ink-500">{p.special}</h3>
            {x.specialTerms.length ? <ol className="list-decimal space-y-1 pl-5 text-[14px] text-ink-900">{x.specialTerms.map((s, i) => <li key={i}>{s}</li>)}</ol> : <p className="text-[14px] text-ink-500">{p.noSpecial}</p>}
          </section>
          <section className="space-y-2 rounded-[5.75px] bg-olive-100/60 p-3">
            <h3 className="text-overline text-ink-500">{p.reminders}</h3>
            <p className="text-[12px] text-ink-500">{p.reminderHint}</p>
            {(["d90", "d60", "d30"] as const).map((k) => {
              const n = Number(k.slice(1)) as 90 | 60 | 30;
              return <ToggleRow key={k} label={`${p[`r${n}`]}${x.due.includes(n) ? ` · ${p.due}` : ""}`} checked={x.reminders[k]} onChange={(v) => setRem(k, v)} />;
            })}
          </section>
          <section className="space-y-2"><h3 className="text-overline text-ink-500">{p.docs}</h3>
            {envs.loading ? <Skel className="h-14" /> : !docs.length ? <p className="text-[14px] text-ink-500">{p.noDocs}</p> : (
              <ul className="space-y-2">{docs.map((e) => (
                <li key={e.id}><button type="button" onClick={() => set({ view: "signatures", id: e.id }, false)} className="flex w-full min-w-0 items-center gap-3 rounded-[5.75px] border border-border-soft p-3 text-left hover:bg-olive-100/60">
                  <FileSignature className="h-4 w-4 shrink-0 text-olive-700" aria-hidden />
                  <div className="min-w-0 flex-1"><TruncatedText text={e.title} className="text-[14px] font-medium text-ink-900" /><p className="text-[12px] text-ink-500">{sg.kinds[e.kind]} · {fill(sg.signed, { n: e.signedCount, total: e.signers.length })}</p></div>
                  <EnvStatusChip s={e.status} />
                </button></li>
              ))}</ul>
            )}
          </section>
          <section className="space-y-2"><h3 className="text-overline text-ink-500">{p.history}</h3>
            <ul className="space-y-1.5">{x.history.map((h, i) => <li key={i} className="flex gap-3 text-[13px]"><span className="w-24 shrink-0 tabular-nums text-ink-500">{formatDate(h.at)}</span><span className="min-w-0 text-ink-900">{h.note}</span></li>)}</ul>
          </section>
          <ConfirmDialog open={del} onOpenChange={setDel} title={p.deleteTitle} body={fill(p.deleteBody, { name: x.tenantName })} onConfirm={async () => { await leaseService.remove(x.id); toast.success(p.deleted); onClose(); }} />
          <ConfirmDialog open={end} onOpenChange={setEnd} tone="primary" title={p.endTitle} body={fill(p.endBody, { name: x.tenantName })} confirmLabel={p.endLease} onConfirm={async () => { await leaseService.end(x.id); toast.success(p.ended); }} />
        </div>
      )}
    </SidePanel>
  );
}

function RenewModal({ x, onClose }: { x: LeaseView; onClose: () => void }) {
  const r = l.renew;
  const oneYear = (() => { const d = new Date(`${x.end}T00:00:00`); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); })();
  const suggested = escalatedRent(x.rent, x.escalationPct);
  const [end, setEnd] = useState(oneYear);
  const [rent, setRent] = useState(String(suggested));
  const [errs, setErrs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const amt = Number(rent.replace(",", "."));
    const issues = renewIssues(x, end, amt);
    setErrs(issues);
    if (issues.length) return;
    setBusy(true);
    try { await leaseService.renew(x.id, end, amt); toast.success(fill(r.done, { date: formatDate(end) })); onClose(); } catch { toast.error(t.common.errorBody); } finally { setBusy(false); }
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={fill(r.title, { number: x.number })}
      footer={<><PillButton variant="secondary" onClick={onClose}>{t.common.cancel}</PillButton><PillButton onClick={submit} disabled={busy}>{busy ? t.common.working : r.submit}</PillButton></>}>
      <div className="space-y-4">
        <p className="rounded-[5.75px] bg-olive-100 p-3 text-[13px] text-ink-900">{fill(r.current, { rent: formatZAR(x.rent), date: formatDate(x.end) })}</p>
        <TextField label={r.end} type="date" value={end} min={x.end} error={errs.includes("end") ? fill(r.errs.end, { date: formatDate(x.end) }) : undefined} onChange={(e) => setEnd(e.target.value)} />
        <TextField label={r.rent} inputMode="decimal" value={rent} error={errs.includes("rent") ? r.errs.rent : undefined} hint={fill(r.suggest, { pct: x.escalationPct, rent: formatZAR(suggested) })} onChange={(e) => setRent(e.target.value)} />
      </div>
    </Modal>
  );
}

function LeaseFormModal({ x, onClose, onCreated }: { x: LeaseView | null; onClose: () => void; onCreated: (id: string) => void }) {
  const fm = l.form;
  const tenants = useData(() => tenantService.list(), []);
  const tpls = useData(() => templateService.list(), []);
  const [v, setV] = useState({
    tenantId: x?.tenantId ?? "", start: x?.start ?? todayIso(), end: x?.end ?? "", rent: x ? String(x.rent) : "", deposit: x ? String(x.deposit) : "",
    escalationPct: String(x?.escalationPct ?? 8), noticeDays: String(x?.noticeDays ?? 30), rentDueDay: String(x?.rentDueDay ?? 1), coTenant: x?.coTenant ?? "", templateId: x?.templateId ?? "tpl-res", special: (x?.specialTerms ?? []).join("\n"),
  });
  const [errs, setErrs] = useState<Partial<Record<keyof typeof v, string>>>({});
  const [busy, setBusy] = useState(false);
  const up = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));
  const pickTenant = (id: string) => {
    const tn = tenants.data?.find((y) => y.id === id);
    setV((s) => ({ ...s, tenantId: id, ...(tn ? { rent: String(tn.rent), deposit: String(tn.deposit), start: tn.leaseStart, end: tn.leaseEnd } : {}) }));
  };
  const submit = async () => {
    const n = (s: string) => Number(s.replace(",", "."));
    const e: typeof errs = {};
    if (!v.tenantId) e.tenantId = fm.errs.tenant;
    if (!v.end || v.end <= v.start) e.end = fm.errs.end;
    if (!(n(v.rent) > 0)) e.rent = fm.errs.rent;
    if (!(n(v.deposit) >= 0) || v.deposit === "") e.deposit = fm.errs.deposit;
    if (!(n(v.escalationPct) >= 0 && n(v.escalationPct) <= 20)) e.escalationPct = fm.errs.escalation;
    if (!(n(v.noticeDays) >= 20)) e.noticeDays = fm.errs.notice;
    if (!(n(v.rentDueDay) >= 1 && n(v.rentDueDay) <= 28)) e.rentDueDay = fm.errs.dueDay;
    setErrs(e);
    if (Object.keys(e).length) return;
    const input: LeaseInput = { tenantId: v.tenantId, start: v.start, end: v.end, rent: n(v.rent), deposit: n(v.deposit), escalationPct: n(v.escalationPct), noticeDays: n(v.noticeDays), rentDueDay: n(v.rentDueDay), templateId: v.templateId, coTenant: v.coTenant.trim() || undefined, specialTerms: v.special.split("\n").map((s) => s.trim()).filter(Boolean) };
    setBusy(true);
    try {
      if (x) { await leaseService.update(x.id, input); toast.success(fm.saved); }
      else { const id = await leaseService.create(input); toast.success(fm.created); onCreated(id); }
      onClose();
    } catch { toast.error(t.common.errorBody); } finally { setBusy(false); }
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={x ? fill(fm.editTitle, { number: x.number }) : fm.title} wide
      footer={<><PillButton variant="secondary" onClick={onClose}>{t.common.cancel}</PillButton><PillButton onClick={submit} disabled={busy}>{busy ? t.common.working : x ? fm.save : fm.create}</PillButton></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><SelectField label={fm.tenant} value={v.tenantId} error={errs.tenantId} disabled={!!x} onChange={(e) => pickTenant(e.target.value)}><option value="">{fm.pickTenant}</option>{(tenants.data ?? []).map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</SelectField></div>
        <TextField label={fm.start} type="date" value={v.start} onChange={(e) => up("start", e.target.value)} />
        <TextField label={fm.end} type="date" value={v.end} min={v.start} error={errs.end} onChange={(e) => up("end", e.target.value)} />
        <TextField label={fm.rent} inputMode="decimal" value={v.rent} error={errs.rent} onChange={(e) => up("rent", e.target.value)} />
        <TextField label={fm.deposit} inputMode="decimal" value={v.deposit} error={errs.deposit} onChange={(e) => up("deposit", e.target.value)} />
        <TextField label={fm.escalation} inputMode="decimal" value={v.escalationPct} error={errs.escalationPct} onChange={(e) => up("escalationPct", e.target.value)} />
        <TextField label={fm.notice} inputMode="numeric" value={v.noticeDays} error={errs.noticeDays} onChange={(e) => up("noticeDays", e.target.value)} />
        <TextField label={fm.dueDay} inputMode="numeric" value={v.rentDueDay} error={errs.rentDueDay} onChange={(e) => up("rentDueDay", e.target.value)} />
        <SelectField label={fm.template} value={v.templateId} onChange={(e) => up("templateId", e.target.value)}>{(tpls.data ?? []).filter((y) => y.kind === "lease").map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</SelectField>
        <div className="sm:col-span-2"><TextField label={fm.coTenant} value={v.coTenant} onChange={(e) => up("coTenant", e.target.value)} /></div>
        <div className="sm:col-span-2"><TextAreaField label={fm.special} hint={fm.specialHint} rows={3} value={v.special} onChange={(e) => up("special", e.target.value)} /></div>
      </div>
    </Modal>
  );
}
