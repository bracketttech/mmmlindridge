import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Phone, CalendarClock } from "lucide-react";
import { calendarService, propertyService, CAL_SLOTS, type CalEvent, type CalKind } from "@/services";
import { Modal, NAvatar } from "@/components/nestly/composites";
import { EmptyState, GlassCard, PageHeader, PillButton, SegmentedChips, Skel, StatusChip, TruncatedText } from "@/components/nestly/primitives";
import { SelectField, TextAreaField } from "@/components/nestly/forms";
import { TextField } from "@/components/nestly/auth";
import { FadeImage } from "@/components/nestly/fade-image";
import { fill, resolvePhoto } from "@/components/nestly/properties/shared";
import { ErrorCard } from "@/components/nestly/billing/OwnerBilling";
import { useAppState } from "@/lib/app-state";
import { useAccess } from "@/lib/access";
import { useData } from "@/lib/use-data";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

const c = t.cal;
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function SchedulePage() {
  const { propertyId } = useAppState();
  const { can } = useAccess();
  const data = useData(() => calendarService.list(propertyId), [propertyId]);
  const today = iso(new Date());
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [kind, setKind] = useState<"all" | CalKind>("all");
  const [selId, setSelId] = useState<string | null>(null);
  const [book, setBook] = useState<{ date: string; time: string } | null>(null);
  const [resched, setResched] = useState<CalEvent | null>(null);
  const evs = (data.data ?? []).filter((e) => kind === "all" || e.kind === kind);
  const dayEvs = evs.filter((e) => e.date === day);
  const sel = evs.find((e) => e.id === selId) ?? dayEvs[0] ?? null;
  const cells = useMemo(() => {
    const first = (month.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i - first + 1));
  }, [month]);
  const weekStart = (() => { const d = new Date(`${today}T00:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); })();
  const weekEnd = (() => { const d = new Date(`${weekStart}T00:00:00`); d.setDate(d.getDate() + 6); return iso(d); })();
  const week = (data.data ?? []).filter((e) => e.date >= weekStart && e.date <= weekEnd);
  const busy = new Set(dayEvs.map((e) => e.time));
  const canEdit = can("schedule", "edit") || can("schedule", "create");
  return (
    <div className="space-y-6">
      <PageHeader title={c.title} muted={c.muted} sub={data.data ? fill(c.sub, { n: week.length, pending: week.filter((e) => e.status === "pending").length }) : undefined}
        actions={<>
          <SegmentedChips label={c.title} value={kind} onChange={setKind} options={(["all", "inspection", "maintenance", "viewing"] as const).map((k) => ({ value: k, label: c.kinds[k] }))} />
          {can("schedule", "create") && <PillButton onClick={() => setBook({ date: day, time: "09:00" })} icon={<CalendarPlus className="h-4 w-4" />}>{c.add}</PillButton>}
        </>} />
      {data.error ? <ErrorCard onRetry={data.reload} /> : (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-4 xl:col-span-3">
            <GlassCard hover={false}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-h3 text-ink-900">{month.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}</h2>
                <div className="flex gap-1">
                  <button aria-label={c.prev} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-full border border-border-soft hover:bg-olive-100"><ChevronLeft className="h-4 w-4" /></button>
                  <button aria-label={c.next} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-full border border-border-soft hover:bg-olive-100"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-y-1 text-center text-[13px]">
                {DOW.map((d) => <span key={d} className="text-[11px] text-ink-500">{d}</span>)}
                {cells.map((d) => {
                  const k = iso(d); const n = evs.filter((e) => e.date === k).length; const out = d.getMonth() !== month.getMonth();
                  return (
                    <button key={k} onClick={() => { setDay(k); setSelId(null); }} aria-label={`${formatDate(k)}${n ? `, ${n}` : ""}`} aria-pressed={k === day}
                      className={cn("relative mx-auto grid h-9 w-9 place-items-center rounded-full", k === day ? "bg-olive-700 text-primary-foreground" : "hover:bg-olive-100", out && k !== day && "text-ink-500/50", k === today && k !== day && "ring-1 ring-olive-700")}>
                      {d.getDate()}{n > 0 && <span aria-hidden className={cn("absolute bottom-1 h-1 w-1 rounded-full", k === day ? "bg-surface-solid" : "bg-olive-700")} />}
                    </button>
                  );
                })}
              </div>
            </GlassCard>
            <GlassCard hover={false}>
              <h2 className="text-h3 text-ink-900">{c.openSlots}</h2><p className="mb-3 text-[12px] text-ink-500">{formatDate(day)}</p>
              <div className="grid grid-cols-3 gap-2">
                {CAL_SLOTS.map((s) => <button key={s} disabled={busy.has(s) || !can("schedule", "create")} onClick={() => setBook({ date: day, time: s })} className="h-10 rounded-full border border-border-soft bg-surface-solid text-[13px] hover:bg-olive-100 disabled:opacity-40 disabled:line-through">{s}</button>)}
              </div>
              <h3 className="mb-2 mt-4 text-[14px] font-medium">{c.thisWeek}</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                {(["inspection", "maintenance", "viewing"] as CalKind[]).map((k) => <div key={k} className="rounded-[5.75px] bg-surface-solid p-2"><p className="text-h2">{week.filter((e) => e.kind === k).length}</p><TruncatedText text={c.kinds[k]} className="text-[11px] text-ink-500" /></div>)}
              </div>
            </GlassCard>
          </div>
          <GlassCard hover={false} className="lg:col-span-8 xl:col-span-5">
            <h2 className="text-h2 text-ink-900">{new Date(`${day}T00:00:00`).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}</h2>
            <p className="mb-4 text-[12px] text-ink-500">{dayEvs.length} {c.visits.toLowerCase()}</p>
            {data.loading ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skel key={i} className="h-16 w-full" />)}</div> : !dayEvs.length ? <EmptyState icon={<CalendarClock className="h-6 w-6" />} title={c.empty} body={c.emptyBody} /> : (
              <ol className="relative space-y-2 pl-20">
                {dayEvs.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-20 top-3 w-14 text-[13px] tabular-nums text-ink-900">{e.time}<span className="block text-[11px] text-ink-500">{fill(c.min, { n: e.duration })}</span></span>
                    <button onClick={() => setSelId(e.id)} aria-pressed={sel?.id === e.id} className={cn("flex w-full min-w-0 items-center gap-3 rounded-[5.75px] border p-2 text-left", sel?.id === e.id ? "border-olive-200 bg-olive-100" : "border-border-soft bg-surface-solid/80 hover:bg-olive-100")}>
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-[4.6px] bg-olive-100">{e.photo && <FadeImage src={resolvePhoto(e.photo)} alt="" width={44} height={44} className="h-full w-full object-cover" />}</span>
                      <span className="min-w-0 flex-1"><TruncatedText text={e.title} className="font-medium text-ink-900" /><TruncatedText text={`${e.withName} · ${c.kindOne[e.kind]}`} className="text-[12px] text-ink-500" /></span>
                      <StatusChip tone={e.status === "confirmed" ? "success" : "neutral"} dot>{c.statuses[e.status]}</StatusChip>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </GlassCard>
          <GlassCard hover={false} className="lg:col-span-12 xl:col-span-4">
            {!sel ? <EmptyState title={c.select} /> : (
              <div className="space-y-4">
                <div className="aspect-[16/9] overflow-hidden rounded-[5.75px] bg-olive-100">{sel.photo && <FadeImage src={resolvePhoto(sel.photo)} alt={sel.propertyName} className="h-full w-full object-cover" />}</div>
                <p className="text-overline text-ink-500">{c.kindOne[sel.kind]} · {formatDate(sel.date)}, {sel.time}</p>
                <div><TruncatedText text={sel.title} as="h3" className="text-h2 text-ink-900" /><TruncatedText text={[sel.propertyName, sel.unitLabel].filter(Boolean).join(" · ")} className="text-[13px] text-ink-500" /></div>
                <div className="flex items-center gap-3 rounded-[5.75px] border border-border-soft bg-surface-solid p-3">
                  <NAvatar name={sel.withName} />
                  <div className="min-w-0 flex-1"><TruncatedText text={sel.withName} className="font-medium" /><TruncatedText text={sel.withRole} className="text-[12px] text-ink-500" /></div>
                  {sel.withPhone && <a href={`tel:${sel.withPhone.replace(/\s/g, "")}`} aria-label={fill(c.call, { name: sel.withName })} className="grid h-10 w-10 place-items-center rounded-full bg-olive-100"><Phone className="h-4 w-4" /></a>}
                </div>
                {sel.notes && <p className="rounded-[5.75px] bg-olive-100 p-3 text-[13px] text-ink-900">{sel.notes}</p>}
                <div className="flex flex-col gap-2">
                  {canEdit && sel.status === "pending" && <PillButton onClick={async () => { await calendarService.confirm(sel.id); toast.success(c.confirmed); }} icon={<Check className="h-4 w-4" />}>{c.confirm}</PillButton>}
                  {canEdit && <PillButton variant="secondary" onClick={() => setResched(sel)} icon={<CalendarClock className="h-4 w-4" />}>{c.reschedule}</PillButton>}
                  <Link to={sel.link.to} search={sel.link.search as never} className="text-center text-[13px] font-medium text-olive-700 underline-offset-2 hover:underline">{c.open}</Link>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}
      {book && <BookModal init={book} onClose={() => setBook(null)} onDone={(d) => { setDay(d); }} />}
      {resched && <ReschedModal e={resched} onClose={() => setResched(null)} onDone={(d) => setDay(d)} />}
    </div>
  );
}

function BookModal({ init, onClose, onDone }: { init: { date: string; time: string }; onClose: () => void; onDone: (d: string) => void }) {
  const props = useData(() => propertyService.list(), []).data ?? [];
  const { propertyId } = useAppState();
  const [f, setF] = useState({ kind: "maintenance" as CalKind, title: "", date: init.date, time: init.time, duration: "60", propertyId: propertyId === "all" ? "" : propertyId, withName: "", notes: "" });
  const [err, setErr] = useState(false);
  const submit = async () => {
    const pid = f.propertyId || props[0]?.id || "";
    if (!f.title.trim() || !pid || !f.withName.trim()) { setErr(true); return; }
    await calendarService.create({ kind: f.kind, title: f.title.trim(), date: f.date, time: f.time, duration: Number(f.duration) || 60, propertyId: pid, withName: f.withName.trim(), withRole: c.kindOne[f.kind], notes: f.notes });
    toast.success(c.form.created); onDone(f.date); onClose();
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={c.form.title} wide footer={<><PillButton variant="secondary" onClick={onClose}>{t.common.cancel}</PillButton><PillButton onClick={submit}>{c.form.create}</PillButton></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label={c.form.kind} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as CalKind })}>{(["maintenance", "inspection", "viewing"] as CalKind[]).map((k) => <option key={k} value={k}>{c.kindOne[k]}</option>)}</SelectField>
        <TextField label={c.form.what} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <TextField label={c.form.date} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <SelectField label={c.form.time} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })}>{CAL_SLOTS.map((s) => <option key={s}>{s}</option>)}</SelectField>
        <SelectField label={c.form.property} value={f.propertyId} onChange={(e) => setF({ ...f, propertyId: e.target.value })}>{props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectField>
        <TextField label={c.form.duration} inputMode="numeric" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value.replace(/\D/g, "") })} />
        <TextField label={c.form.with} value={f.withName} onChange={(e) => setF({ ...f, withName: e.target.value })} />
        <TextAreaField label={c.form.notes} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </div>
      {err && <p role="alert" className="mt-3 text-[13px] text-danger">{c.form.errs}</p>}
    </Modal>
  );
}

function ReschedModal({ e, onClose, onDone }: { e: CalEvent; onClose: () => void; onDone: (d: string) => void }) {
  const [date, setDate] = useState(e.date);
  const [time, setTime] = useState(e.time);
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={c.reschedule} footer={<PillButton onClick={async () => { await calendarService.reschedule(e.id, date, time); toast.success(c.rescheduled); onDone(date); onClose(); }}>{c.reschedule}</PillButton>}>
      <div className="space-y-3"><TruncatedText text={e.title} className="font-medium" /><TextField label={c.form.date} type="date" value={date} onChange={(x) => setDate(x.target.value)} />
        <div className="grid grid-cols-3 gap-2">{CAL_SLOTS.map((s) => <button key={s} onClick={() => setTime(s)} aria-pressed={time === s} className={cn("h-10 rounded-full border text-[13px]", time === s ? "border-olive-700 bg-olive-700 text-primary-foreground" : "border-border-soft bg-surface-solid")}>{s}</button>)}</div></div>
    </Modal>
  );
}
