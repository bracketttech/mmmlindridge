import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Gavel, Paperclip, Plus, Scale } from "lucide-react";
import { evictionService, noticeService, previewNotice, tenantService, NOTICE_KINDS, NOTICE_TEMPLATES, type CaseView, type NoticeKind, type NoticeView, type EvictionReason } from "@/services";
import { EVICTION_STAGES, NOTICE_CHANNELS, addBusinessDays, isFinal, type EvictionOutcome, type NoticeChannel, type DeliveryState } from "@/lib/legal-rules";
import { DataTable, KpiTile, Modal, type Column } from "@/components/nestly/composites";
import { EmptyState, GlassCard, PageHeader, PillButton, SegmentedChips, StatusChip, Stepper, TruncatedText, type Tone } from "@/components/nestly/primitives";
import { SidePanel } from "@/components/nestly/overlays";
import { ChipMultiSelect, SelectField, TextAreaField } from "@/components/nestly/forms";
import { TextField } from "@/components/nestly/auth";
import { fill } from "@/components/nestly/properties/shared";
import { ErrorCard } from "@/components/nestly/billing/OwnerBilling";
import { useAppState } from "@/lib/app-state";
import { useAccess } from "@/lib/access";
import { useData } from "@/lib/use-data";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

const g = t.legalDesk;
const DTONE: Record<DeliveryState, Tone> = { queued: "neutral", sent: "info", delivered: "success", read: "strong", failed: "danger" };
export const DeliveryChip = ({ s }: { s: DeliveryState }) => <StatusChip tone={DTONE[s]} dot>{g.delivery[s]}</StatusChip>;
const todayIso = () => new Date().toISOString().slice(0, 10);
type View = "notices" | "templates" | "eviction";

export function LawfulNote() {
  return <div role="note" className="flex items-start gap-3 rounded-[5.75px] border border-info/30 bg-info/10 p-4 text-[13px] text-ink-900"><Scale className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />{g.lawful}</div>;
}

export function LegalPage() {
  const { propertyId } = useAppState();
  const { can } = useAccess();
  const [view, setView] = useState<View>("notices");
  const notices = useData(() => noticeService.list(propertyId), [propertyId]);
  const cases = useData(() => evictionService.list(propertyId), [propertyId]);
  const [gen, setGen] = useState<NoticeKind | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [openCase, setOpenCase] = useState<{ tenantId?: string; noticeId?: string } | null>(null);
  // Poll while deliveries are still in flight.
  const live = (notices.data ?? []).some((n) => n.deliveries.some((d) => !isFinal(d.state, d.channel)));
  useEffect(() => { if (!live) return; const i = setInterval(() => notices.reload(), 4000); return () => clearInterval(i); }, [live]); // eslint-disable-line react-hooks/exhaustive-deps
  const ns = notices.data ?? [];
  const month = todayIso().slice(0, 7);
  const openCases = (cases.data ?? []).filter((c) => !c.closed);
  const cols: Column<NoticeView>[] = [
    { key: "n", header: g.cols.notice, render: (n) => <div className="min-w-0 max-w-[260px]"><TruncatedText text={g.kinds[n.kind]} className="font-medium text-ink-900" /><span className="text-[12px] text-ink-500">{n.number}</span></div> },
    { key: "t", header: g.cols.tenant, render: (n) => <div className="max-w-[220px]"><TruncatedText text={n.tenantName} /><TruncatedText text={n.place} className="text-[12px] text-ink-500" /></div> },
    { key: "s", header: g.cols.sent, render: (n) => formatDate(n.sentAt) },
    { key: "d", header: g.cols.delivery, render: (n) => <div className="flex flex-wrap gap-1">{n.deliveries.map((d) => <span key={d.channel} className="text-[12px] text-ink-500">{g.channels[d.channel]}: <DeliveryChip s={d.state} /></span>)}</div> },
    { key: "o", header: g.cols.status, render: (n) => <DeliveryChip s={n.overall} /> },
  ];
  const sn = ns.find((n) => n.id === sel);
  return (
    <div className="space-y-6">
      <PageHeader title={g.title} muted={g.muted} sub={fill(g.sub, { sent: ns.length, open: openCases.length })}
        actions={can("legal", "create") && <PillButton onClick={() => setGen("reminder")} icon={<Plus className="h-4 w-4" />}>{g.generate}</PillButton>} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiTile loading={notices.loading} label={g.kpi.sent} value={String(ns.filter((n) => n.sentAt.startsWith(month)).length)} />
        <KpiTile loading={notices.loading} label={g.kpi.served} value={String(ns.filter((n) => n.overall === "delivered" || n.overall === "read").length)} />
        <KpiTile loading={notices.loading} label={g.kpi.failed} value={String(ns.filter((n) => n.deliveries.some((d) => d.state === "failed")).length)} />
        <KpiTile loading={cases.loading} label={g.kpi.open} value={String(openCases.length)} />
      </div>
      <SegmentedChips label={g.title} value={view} onChange={setView} options={(["notices", "templates", "eviction"] as View[]).map((v) => ({ value: v, label: g.views[v] }))} />
      {notices.error || cases.error ? <ErrorCard onRetry={() => { notices.reload(); cases.reload(); }} />
        : view === "notices" ? (
          <GlassCard hover={false}>
            <DataTable caption={g.views.notices} rows={ns} columns={cols} loading={notices.loading} onSelect={setSel} selectedId={sel ?? undefined}
              empty={<EmptyState icon={<FileText className="h-6 w-6" />} title={g.empty} body={g.emptyBody} />}
              card={(n) => <button type="button" onClick={() => setSel(n.id)} className="w-full min-w-0 space-y-1 text-left"><div className="flex items-center justify-between gap-2"><TruncatedText text={g.kinds[n.kind]} className="font-medium" /><DeliveryChip s={n.overall} /></div><TruncatedText text={`${n.tenantName} · ${n.place}`} className="text-[12px] text-ink-500" /><p className="text-[12px] text-ink-500">{n.number} · {formatDate(n.sentAt)}</p></button>} />
          </GlassCard>
        ) : view === "templates" ? (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-500">{g.review}</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {NOTICE_TEMPLATES.map((tp) => (
                <GlassCard key={tp.kind} className="flex flex-col gap-3">
                  <div><h3 className="text-h3 text-ink-900">{g.kinds[tp.kind]}</h3><p className="text-[13px] text-ink-500">{g.kindHints[tp.kind]}</p></div>
                  <p className="line-clamp-4 whitespace-pre-line text-[13px] text-ink-500">{tp.body}</p>
                  <div className="flex flex-wrap gap-1">{tp.fields.map((f) => <code key={f} className="rounded bg-olive-100 px-1.5 text-[11px] text-olive-900">{`{{${f}}}`}</code>)}</div>
                  {can("legal", "create") && <PillButton size="sm" variant="secondary" className="mt-auto self-start" onClick={() => setGen(tp.kind)}>{g.useTpl}</PillButton>}
                </GlassCard>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <LawfulNote />
            {can("legal", "create") && <PillButton variant="secondary" onClick={() => setOpenCase({})} icon={<Gavel className="h-4 w-4" />}>{g.newCase}</PillButton>}
            {!cases.loading && !(cases.data ?? []).length ? <GlassCard hover={false}><EmptyState icon={<Gavel className="h-6 w-6" />} title={g.noCases} body={g.noCasesBody} /></GlassCard>
              : (cases.data ?? []).map((c) => <CaseCard key={c.id} c={c} canEdit={can("legal", "edit")} />)}
          </div>
        )}
      {gen && <GenerateNotice initial={gen} onClose={() => setGen(null)} onSent={(id) => { setView("notices"); setSel(id); }} />}
      <SidePanel open={!!sn} onOpenChange={(o) => !o && setSel(null)} title={sn ? fill(g.detail, { number: sn.number }) : ""} wide
        footer={sn && can("legal", "create") && !sn.caseId && (sn.kind === "demand" || sn.kind === "breach") && <PillButton size="sm" variant="secondary" onClick={() => { setOpenCase({ tenantId: sn.tenantId, noticeId: sn.id }); setSel(null); }}>{g.openCase}</PillButton>}>
        {sn && <div className="space-y-4">
          <div className="flex flex-wrap gap-2">{sn.deliveries.map((d) => <div key={d.channel} className="rounded-[5.75px] border border-border-soft px-3 py-2 text-[12px]"><p className="font-medium">{g.channels[d.channel]}</p><DeliveryChip s={d.state} />{d.failReason && <p className="text-danger">{d.failReason}</p>}</div>)}</div>
          <div className="rounded-[5.75px] border border-border-soft bg-surface-solid p-4"><p className="mb-2 font-medium">{sn.subject}</p><p className="whitespace-pre-line text-[14px] text-ink-900">{sn.body}</p></div>
          <p className="text-[12px] text-ink-500">{sn.sentBy} · {formatDate(sn.sentAt)}</p>
        </div>}
      </SidePanel>
      {openCase && <OpenCaseModal init={openCase} onClose={() => setOpenCase(null)} onDone={() => setView("eviction")} />}
    </div>
  );
}

function useTenants() { const { propertyId } = useAppState(); return useData(() => tenantService.list(propertyId), [propertyId]).data ?? []; }

function GenerateNotice({ initial, onClose, onSent }: { initial: NoticeKind; onClose: () => void; onSent: (id: string) => void }) {
  const tenants = useTenants();
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<NoticeKind>(initial);
  const [tenantId, setTenantId] = useState("");
  const [breach, setBreach] = useState("");
  const [remedy, setRemedy] = useState(addBusinessDays(todayIso(), 20));
  const [vacate, setVacate] = useState(addBusinessDays(todayIso(), 20));
  const [channels, setChannels] = useState<NoticeChannel[]>(["email", "whatsapp"]);
  const [busy, setBusy] = useState(false);
  const extras = { breach_details: breach, remedy_date: remedy, vacate_date: vacate };
  const pv = useMemo(() => (tenantId ? previewNotice(kind, tenantId, extras) : null), [kind, tenantId, breach, remedy, vacate]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = async () => {
    if (!channels.length) { toast.error(g.pickChannel); return; }
    setBusy(true);
    try { const id = await noticeService.send({ kind, tenantId, extras, channels }); toast.success(fill(g.sentOk, { number: "" }).trim()); onSent(id); onClose(); } finally { setBusy(false); }
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={g.generate} wide
      footer={<>
        {step > 0 && <PillButton variant="secondary" onClick={() => setStep(step - 1)}>{t.common.back}</PillButton>}
        {step < 2 ? <PillButton disabled={!tenantId || (step === 1 && !!pv?.missing.length)} onClick={() => setStep(step + 1)}>{t.onboarding.next}</PillButton>
          : <PillButton onClick={send} disabled={busy}>{busy ? t.common.working : g.send}</PillButton>}
      </>}>
      <div className="space-y-4">
        <Stepper steps={[...g.steps]} current={step} />
        {(kind === "termination" || kind === "demand") && <LawfulNote />}
        {step === 0 && <div className="space-y-3">
          <SelectField label={g.views.templates} value={kind} onChange={(e) => setKind(e.target.value as NoticeKind)}>{NOTICE_KINDS.map((k) => <option key={k} value={k}>{g.kinds[k]}</option>)}</SelectField>
          <SelectField label={g.tenant} value={tenantId} onChange={(e) => setTenantId(e.target.value)}><option value="">{g.pickTenant}</option>{tenants.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectField>
          {(kind === "breach" || kind === "termination") && <TextAreaField label={g.breach} placeholder={g.breachPh} value={breach} onChange={(e) => setBreach(e.target.value)} />}
          {(kind === "breach" || kind === "demand") && <TextField label={g.remedy} type="date" value={remedy} onChange={(e) => setRemedy(e.target.value)} />}
          {kind === "termination" && <TextField label={g.vacate} type="date" value={vacate} onChange={(e) => setVacate(e.target.value)} />}
        </div>}
        {step === 1 && pv && <div className="space-y-3">
          {pv.missing.length > 0 && <p role="alert" className="text-[13px] text-danger">{fill(g.missing, { fields: pv.missing.join(", ") })}</p>}
          <div className="rounded-[5.75px] border border-border-soft bg-surface-solid p-4"><p className="mb-2 font-medium">{pv.subject}</p><p className="whitespace-pre-line text-[14px]">{pv.body}</p></div>
          <p className="text-[13px] font-medium">{g.mergeTitle}</p>
          <dl className="grid gap-x-4 gap-y-1 text-[12px] sm:grid-cols-2">{pv.fields.map((f) => <div key={f} className="flex min-w-0 justify-between gap-2 border-b border-border-soft py-1"><dt className="text-ink-500">{f}</dt><dd className={cn("min-w-0 truncate", !pv.values[f] && "text-danger")}>{pv.values[f] || "—"}</dd></div>)}</dl>
        </div>}
        {step === 2 && <div className="space-y-2"><p className="text-[14px] font-medium">{g.sendVia}</p><ChipMultiSelect label={g.sendVia} value={channels} onChange={setChannels} options={NOTICE_CHANNELS.map((c) => ({ value: c, label: g.channels[c] }))} /></div>}
      </div>
    </Modal>
  );
}

function OpenCaseModal({ init, onClose, onDone }: { init: { tenantId?: string; noticeId?: string }; onClose: () => void; onDone: () => void }) {
  const tenants = useTenants();
  const [tenantId, setTenantId] = useState(init.tenantId ?? "");
  const [reason, setReason] = useState<EvictionReason>("arrears");
  const [attorney, setAttorney] = useState("");
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={g.caseTitle}
      footer={<><PillButton variant="secondary" onClick={onClose}>{t.common.cancel}</PillButton><PillButton disabled={!tenantId} onClick={async () => { await evictionService.open({ tenantId, reason, attorney, noticeId: init.noticeId }); toast.success(fill(g.opened, { number: "" }).trim()); onDone(); onClose(); }}>{g.newCase}</PillButton></>}>
      <div className="space-y-3">
        <LawfulNote />
        <SelectField label={g.tenant} value={tenantId} onChange={(e) => setTenantId(e.target.value)}><option value="">{g.pickTenant}</option>{tenants.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</SelectField>
        <SelectField label={g.reason} value={reason} onChange={(e) => setReason(e.target.value as EvictionReason)}>{(Object.keys(g.reasons) as EvictionReason[]).map((r) => <option key={r} value={r}>{g.reasons[r]}</option>)}</SelectField>
        <TextField label={g.attorney} value={attorney} onChange={(e) => setAttorney(e.target.value)} />
      </div>
    </Modal>
  );
}

function CaseCard({ c, canEdit }: { c: CaseView; canEdit: boolean }) {
  const [close, setClose] = useState(false);
  const [outcome, setOutcome] = useState<EvictionOutcome>("vacated");
  const [note, setNote] = useState("");
  const cur = c.current;
  const rec = cur ? c.stages[cur] : undefined;
  return (
    <GlassCard hover={false} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><TruncatedText text={`${c.tenantName} · ${c.place}`} className="text-h3 text-ink-900" /><p className="text-[12px] text-ink-500">{c.number} · {g.reasons[c.reason]} · {c.attorney}</p></div>
        {c.closed ? <StatusChip tone="neutral">{fill(g.closedOn, { date: formatDate(c.closed.at), outcome: g.outcomes[c.closed.outcome] })}</StatusChip> : <StatusChip tone="warning" dot>{c.pct}%</StatusChip>}
      </div>
      <ol className="grid gap-2 md:grid-cols-7">
        {EVICTION_STAGES.map((st, i) => {
          const r = c.stages[st];
          const done = i < c.stage, active = i === c.stage && !c.closed;
          return (
            <li key={st} className={cn("min-w-0 rounded-[5.75px] border p-2 text-[12px]", done ? "border-olive-700 bg-olive-100" : active ? "border-warning bg-warning/10" : "border-border-soft")} title={g.stageHints[st]}>
              <TruncatedText text={g.stages[st]} lines={2} className="font-medium text-ink-900" />
              <p className="text-ink-500">{r?.date ? formatDate(r.date) : "—"}</p>
              {!!r?.docs.length && <p className="flex items-center gap-1 text-ink-500"><Paperclip className="h-3 w-3" />{r.docs.length}</p>}
            </li>
          );
        })}
      </ol>
      {!c.closed && cur && canEdit && (
        <div className="space-y-3 rounded-[5.75px] border border-border-soft p-3">
          <p className="text-[13px] font-medium">{g.current}: {g.stages[cur]} <span className="font-normal text-ink-500">— {g.stageHints[cur]}</span></p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={g.stageDate} type="date" value={rec?.date ?? ""} onChange={(e) => void evictionService.recordStage(c.id, cur, { date: e.target.value })} />
            <label className="block space-y-1.5 text-[14px] font-medium">{g.addDoc}<input type="file" accept=".pdf,image/*" className="block w-full text-[13px]" onChange={(e) => { const f = e.target.files?.[0]; if (f) void evictionService.addDoc(c.id, cur, { name: f.name, size: f.size, type: f.type }); e.target.value = ""; }} /></label>
          </div>
          {!!rec?.docs.length && <ul className="flex flex-wrap gap-2">{rec.docs.map((d) => <li key={d.name} className="inline-flex max-w-full items-center gap-1 rounded-full bg-olive-100 px-2 py-0.5 text-[12px]"><Paperclip className="h-3 w-3 shrink-0" /><TruncatedText text={d.name} /></li>)}</ul>}
          {rec?.note && <p className="text-[13px] text-ink-500">{rec.note}</p>}
          <div className="flex flex-wrap gap-2">
            <PillButton size="sm" onClick={async () => { if (c.issue === "date") { toast.error(g.needDate); return; } await evictionService.advance(c.id); toast.success(g.advanced); }}>{g.next}</PillButton>
            <PillButton size="sm" variant="secondary" onClick={() => setClose(true)}>{g.close}</PillButton>
          </div>
        </div>
      )}
      {c.closed?.note && <p className="text-[13px] text-ink-500">{c.closed.note}</p>}
      <Modal open={close} onOpenChange={setClose} title={g.close} footer={<PillButton onClick={async () => { await evictionService.close(c.id, outcome, note); toast.success(g.closed); setClose(false); }}>{g.close}</PillButton>}>
        <div className="space-y-3">
          <SelectField label={g.outcome} value={outcome} onChange={(e) => setOutcome(e.target.value as EvictionOutcome)}>{(Object.keys(g.outcomes) as EvictionOutcome[]).map((o) => <option key={o} value={o}>{g.outcomes[o]}</option>)}</SelectField>
          <TextAreaField label={g.stageNote} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </Modal>
    </GlassCard>
  );
}
