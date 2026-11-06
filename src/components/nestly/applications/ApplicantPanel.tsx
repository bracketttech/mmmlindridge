import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, FileText, UserPlus } from "lucide-react";
import { APP_STAGES, CHECK_KEYS, type AppStage, type CheckKey, type ScreeningCheck } from "@/mocks/leasing";
import { applicationService, type ApplicationView } from "@/services";
import { PillButton, StatusChip, TruncatedText, type Tone } from "@/components/nestly/primitives";
import { Modal } from "@/components/nestly/composites";
import { SelectField, TextAreaField } from "@/components/nestly/forms";
import { SidePanel } from "@/components/nestly/overlays";
import { fill } from "@/components/nestly/properties/shared";
import { fmtSize } from "@/components/nestly/requests/shared";
import { todayIso } from "@/components/nestly/leasing/shared";
import { freeSlots, screeningProgress } from "@/lib/leasing-rules";
import { formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { ScreeningChecklist } from "./ScreeningChecklist";

const a = t.apps;
const d = a.detail;
const STAGE_TONE: Record<AppStage, Tone> = { enquiry: "neutral", viewing: "info", applied: "info", screening: "warning", approved: "success", declined: "danger" };
export const StageChip = ({ s }: { s: AppStage }) => <StatusChip tone={STAGE_TONE[s]} dot>{a.stages[s]}</StatusChip>;
const MOVABLE: AppStage[] = ["enquiry", "viewing", "applied", "screening"];

export function ApplicantPanel({ x, all, onClose }: { x: ApplicationView | null; all: ApplicationView[]; onClose: () => void }) {
  const [over, setOver] = useState<Partial<Record<CheckKey, ScreeningCheck>>>({});
  const [declining, setDeclining] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setOver({}), [x?.id]);

  const checks = useMemo(() => ({ ...(x?.checks ?? {}), ...over }), [x?.checks, over]);
  const progress = useMemo(() => screeningProgress(checks, CHECK_KEYS), [checks]);
  if (!x) return null;

  const decided = x.stage === "approved" || x.stage === "declined";
  const canScreen = x.stage === "applied" || x.stage === "screening" || decided;
  const setCheck = (k: CheckKey, c: ScreeningCheck) => { setOver((o) => ({ ...o, [k]: c })); void applicationService.updateCheck(x.id, k, c).catch(() => toast.error(t.common.errorBody)); };
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); toast.success(ok); } catch { toast.error(t.common.errorBody); } finally { setBusy(false); } };
  const convert = async () => {
    setBusy(true);
    try { await applicationService.convert(x.id); toast.success(d.converted); } catch { toast.error(t.common.errorBody); } finally { setBusy(false); }
  };

  const footer = x.stage === "declined" ? undefined : x.stage === "approved" ? (
    x.tenantId && x.leaseId ? <>
      <Link to="/tenants" search={{ t: x.tenantId }} className="inline-flex h-11 items-center rounded-full border border-border-soft bg-surface-solid px-5 text-[14px] font-medium text-ink-900 hover:bg-olive-100">{d.openTenant}</Link>
      <Link to="/leases" search={{ id: x.leaseId }} className="inline-flex h-11 items-center gap-3 rounded-full bg-olive-700 pl-5 pr-1.5 text-[14px] font-medium text-primary-foreground hover:bg-olive-800">{d.openLease}<span className="grid h-8 w-8 place-items-center rounded-full bg-surface-solid text-olive-900"><FileText className="h-4 w-4" /></span></Link>
    </> : <PillButton onClick={convert} disabled={busy} icon={<UserPlus className="h-4 w-4" />}>{busy ? t.common.working : d.convert}</PillButton>
  ) : <>
    <PillButton variant="ghost" onClick={() => setDeclining(true)} disabled={busy}>{d.decline}</PillButton>
    {x.ready ? <>
      <PillButton variant="secondary" onClick={() => run(() => applicationService.setReady(x.id, false), d.unready)} disabled={busy}>{d.unready}</PillButton>
      <PillButton onClick={() => run(() => applicationService.approve(x.id), d.approved)} disabled={busy} icon={<CheckCircle2 className="h-4 w-4" />}>{d.approve}</PillButton>
    </> : canScreen && <PillButton onClick={() => run(() => applicationService.setReady(x.id, true), d.readyDone)} disabled={busy || !progress.canMarkReady} aria-describedby="scr-title">{d.ready}</PillButton>}
  </>;

  return (
    <SidePanel open onOpenChange={(o) => !o && onClose()} title={x.name} wide footer={footer}>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><TruncatedText text={`${x.unitLabel} · ${x.propertyName}`} className="text-[14px] text-ink-900" /><p className="text-[12px] text-ink-500">{a.sources[x.source]} · {a.cols.applied} {formatDate(x.createdAt)}</p></div>
          <div className="flex shrink-0 flex-col items-end gap-1.5"><StageChip s={x.stage} />{x.ready && x.stage !== "approved" && <StatusChip tone="success">{a.scr.readyBadge}</StatusChip>}</div>
        </div>
        {x.stage === "declined" && <p role="status" className="rounded-[5.75px] bg-danger/10 p-3 text-[13px] text-danger">{fill(d.declinedNote, { reason: x.declineReason ?? "" })}</p>}
        {x.stage === "approved" && <p role="status" className="rounded-[5.75px] bg-olive-200 p-3 text-[13px] text-olive-900">{x.tenantId ? d.converted : d.approvedNote}</p>}
        {!decided && (
          <SelectField label={d.stage} value={x.stage} onChange={(e) => run(() => applicationService.setStage(x.id, e.target.value as AppStage), `${d.stage}: ${a.stages[e.target.value as AppStage]}`)}>
            {APP_STAGES.filter((s) => MOVABLE.includes(s)).map((s) => <option key={s} value={s}>{a.stages[s]}</option>)}
          </SelectField>
        )}
        <section className="space-y-2"><h3 className="text-overline text-ink-500">{d.contact}</h3>
          <TruncatedText text={x.email} className="text-[14px] text-ink-900" /><p className="text-[14px] tabular-nums text-ink-900">{x.phone}</p>
        </section>
        <dl className="grid grid-cols-2 gap-3 text-[14px]">
          {([
            [d.income, x.income ? formatZAR(x.income) : "—"], [a.cols.afford, x.afford ? `${String(x.afford.ratio).replace(".", ",")}% · ${a.scr.results[x.afford.result]}` : "—"],
            [d.employer, x.employer || "—"], [d.moveIn, x.moveIn ? formatDate(x.moveIn) : "—"],
            [d.occupants, String(x.occupants)], [d.idNo, x.idNumber || "—"],
          ] as [string, string][]).map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-overline text-ink-500">{k}</dt><dd><TruncatedText text={v} className="text-ink-900" /></dd></div>)}
        </dl>
        {x.message && <section className="space-y-1"><h3 className="text-overline text-ink-500">{d.message}</h3><p className="text-[14px] text-ink-700">{x.message}</p></section>}
        <section className="space-y-2"><h3 className="text-overline text-ink-500">{d.consent}</h3>
          <ul className="space-y-1 text-[13px]">
            {([[d.popia, x.popiaConsent], [d.credit, x.creditConsent]] as [string, boolean][]).map(([k, v]) => <li key={k} className="flex items-start justify-between gap-3"><span className="min-w-0 text-ink-700">{k}</span><StatusChip tone={v ? "success" : "neutral"}>{v ? d.yes : d.no}</StatusChip></li>)}
          </ul>
        </section>
        <section className="space-y-2"><h3 className="text-overline text-ink-500">{d.docs}</h3>
          {x.docs.length ? <ul className="space-y-1.5">{x.docs.map((f) => <li key={f.name} className="flex min-w-0 items-center gap-2 rounded-[5.75px] border border-border-soft px-3 py-2 text-[13px]"><FileText className="h-4 w-4 shrink-0 text-olive-700" aria-hidden /><TruncatedText text={f.name} className="flex-1 text-ink-900" /><span className="shrink-0 text-ink-500">{fmtSize(f.size)}</span></li>)}</ul> : <p className="text-[14px] text-ink-500">{d.noDocs}</p>}
        </section>
        <ViewingBlock x={x} all={all} disabled={decided} />
        {canScreen ? <ScreeningChecklist key={x.id} app={x} checks={checks} progress={progress} locked={decided} onChange={setCheck} />
          : <p className="rounded-[5.75px] bg-olive-100/60 p-3 text-[13px] text-ink-700">{fill(a.scr.notYet, { name: x.name.split(" ")[0] ?? x.name })}</p>}
        {decided && canScreen && <p className="text-[12px] text-ink-500">{a.scr.locked}</p>}
        <section className="space-y-2"><h3 className="text-overline text-ink-500">{d.history}</h3>
          <ul className="space-y-1.5">{x.history.map((h, i) => <li key={i} className="flex gap-3 text-[13px]"><span className="w-24 shrink-0 tabular-nums text-ink-500">{formatDate(h.at)}</span><span className="min-w-0 text-ink-900">{h.note}</span></li>)}</ul>
        </section>
      </div>
      <DeclineModal open={declining} name={x.name} onClose={() => setDeclining(false)} onDecline={async (r) => { await applicationService.decline(x.id, r); toast.success(d.declined); }} />
    </SidePanel>
  );
}

function ViewingBlock({ x, all, disabled }: { x: ApplicationView; all: ApplicationView[]; disabled: boolean }) {
  const v = a.view;
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState("");
  const [open, setOpen] = useState(false);
  const booked = all.filter((y) => y.unitId === x.unitId && y.viewing?.state === "booked").map((y) => y.viewing!);
  const free = freeSlots(date, booked, new Date());
  const book = async () => {
    if (!time) return;
    await applicationService.bookViewing(x.id, date, time);
    toast.success(fill(v.booked, { name: x.name }));
    setOpen(false); setTime("");
  };
  return (
    <section className="space-y-2"><h3 className="text-overline text-ink-500">{d.viewing}</h3>
      {x.viewing ? (
        <div className="flex flex-wrap items-center gap-2 text-[14px] text-ink-900"><CalendarClock className="h-4 w-4 text-olive-700" aria-hidden />{formatDate(x.viewing.date)} · {x.viewing.time}<StatusChip tone={x.viewing.state === "done" ? "success" : x.viewing.state === "no_show" ? "danger" : "info"}>{v.states[x.viewing.state]}</StatusChip></div>
      ) : <p className="text-[14px] text-ink-500">{d.noViewing}</p>}
      {!disabled && (!x.viewing || x.viewing.state !== "booked") && (open ? (
        <div className="grid gap-2 rounded-[5.75px] border border-border-soft p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="block space-y-1"><span className="block text-[13px] font-medium text-ink-900">{v.day}</span><input type="date" value={date} min={todayIso()} onChange={(e) => { setDate(e.target.value); setTime(""); }} className="h-11 w-full rounded-[5.75px] border border-input bg-surface-solid px-3 text-[14px] outline-none focus:border-olive-700" /></label>
          <SelectField label={v.time} value={time} onChange={(e) => setTime(e.target.value)} className="h-11"><option value="">{free.length ? "—" : v.noSlots}</option>{free.map((s) => <option key={s} value={s}>{s}</option>)}</SelectField>
          <PillButton size="sm" onClick={book} disabled={!time}>{v.book}</PillButton>
        </div>
      ) : <PillButton size="sm" variant="secondary" onClick={() => setOpen(true)} icon={<CalendarClock className="h-3.5 w-3.5" />}>{d.bookViewing}</PillButton>)}
    </section>
  );
}

function DeclineModal({ open, name, onClose, onDecline }: { open: boolean; name: string; onClose: () => void; onDecline: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason.trim()) { setErr(d.declineErr); return; }
    setBusy(true);
    try { await onDecline(reason.trim()); onClose(); setReason(""); } catch { setErr(t.common.errorBody); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onOpenChange={(o) => !o && !busy && onClose()} title={fill(d.declineTitle, { name })}
      footer={<><PillButton variant="secondary" onClick={onClose} disabled={busy}>{t.common.cancel}</PillButton><PillButton variant="danger" onClick={submit} disabled={busy}>{busy ? t.common.working : d.decline}</PillButton></>}>
      <TextAreaField label={d.declineReason} rows={3} value={reason} error={err} onChange={(e) => { setReason(e.target.value); setErr(""); }} />
    </Modal>
  );
}
