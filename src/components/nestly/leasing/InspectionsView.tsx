import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Camera, ClipboardList, Lock, Plus, Send, X } from "lucide-react";
import type { Condition } from "@/mocks/leasing";
import { inspectionService, leaseService, type InspectionView } from "@/services";
import { EmptyState, GlassCard, PillButton, Skel, TruncatedText } from "@/components/nestly/primitives";
import { Modal } from "@/components/nestly/composites";
import { SelectField, TextAreaField } from "@/components/nestly/forms";
import { TextField } from "@/components/nestly/auth";
import { ConfirmDialog, SidePanel } from "@/components/nestly/overlays";
import { fill, imageFileToDataUrl } from "@/components/nestly/properties/shared";
import { ProgressCell } from "@/components/nestly/composites";
import { useAppState } from "@/lib/app-state";
import { useData } from "@/lib/use-data";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { InspStateChip, l, todayIso } from "./shared";
import type { SetLeaseSearch } from "./OwnerLeases";

const ins = l.insp;
const CONDITIONS: Condition[] = ["good", "fair", "poor", "na"];
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX = 10 * 1024 * 1024;
const PHOTOS_PER_ROOM = 8;
const photosLabel = (n: number) => (n === 1 ? ins.photo : fill(ins.photos, { n }));

export function InspectionsView({ id, set }: { id?: string | undefined; set: SetLeaseSearch }) {
  const { propertyId } = useAppState();
  const data = useData(() => inspectionService.list(propertyId), [propertyId]);
  const [add, setAdd] = useState(false);
  const all = data.data ?? [];
  const sel = all.find((x) => x.id === id) ?? null;
  return (
    <div className="space-y-4">
      <GlassCard hover={false} className="flex flex-wrap items-center gap-3 p-4 md:p-5">
        <div className="min-w-0 flex-1"><h2 className="text-h3 text-ink-900">{ins.title}</h2><p className="text-[13px] text-ink-500">{ins.sub}</p></div>
        <PillButton size="sm" onClick={() => setAdd(true)} icon={<Plus className="h-3.5 w-3.5" />}>{ins.add}</PillButton>
      </GlassCard>
      {data.error ? <GlassCard hover={false}><EmptyState tone="error" title={t.common.errorTitle} action={<PillButton variant="secondary" onClick={data.reload}>{t.common.retry}</PillButton>} /></GlassCard>
        : data.loading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skel key={i} className="h-36" />)}</div>
        : !all.length ? <GlassCard hover={false}><EmptyState icon={<ClipboardList className="h-6 w-6" />} title={ins.emptyTitle} body={ins.emptyBody} action={<PillButton onClick={() => setAdd(true)}>{ins.add}</PillButton>} /></GlassCard> : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {all.map((x) => (
              <li key={x.id} className="min-w-0">
                <button type="button" onClick={() => set({ id: x.id }, false)} className={cn("glass lift block w-full space-y-3 rounded-[8.05px] p-4 text-left", id === x.id && "ring-2 ring-olive-700")}>
                  <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><TruncatedText text={x.place} className="font-medium text-ink-900" /><TruncatedText text={`${ins.types[x.type]} · ${x.tenantName}`} className="text-[12px] text-ink-500" /></div><InspStateChip s={x.state} /></div>
                  <ProgressCell value={x.items ? Math.round((x.rated / x.items) * 100) : 0} />
                  <div className="flex items-center justify-between gap-2 text-[12px] text-ink-500"><span>{fill(ins.progress, { rated: x.rated, items: x.items })}</span><span className="whitespace-nowrap">{formatDate(x.date)} · {photosLabel(x.photos)}</span></div>
                </button>
              </li>
            ))}
          </ul>
        )}
      <InspectionPanel x={sel} onClose={() => set({ id: undefined })} set={set} />
      {add && <NewInspection onClose={() => setAdd(false)} onCreated={(nid) => set({ id: nid }, false)} />}
    </div>
  );
}

function NewInspection({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const f = ins.form;
  const leases = useData(() => leaseService.list(), []);
  const [type, setType] = useState<"incoming" | "outgoing">("incoming");
  const [leaseId, setLeaseId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [inspector, setInspector] = useState("Janice Tinto");
  const [errs, setErrs] = useState<{ lease?: string; date?: string }>({});
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const e: typeof errs = {};
    if (!leaseId) e.lease = f.errs.lease;
    if (!date) e.date = f.errs.date;
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try { const id = await inspectionService.create({ type, leaseId, date, inspector: inspector.trim() || "Janice Tinto" }); toast.success(f.created); onCreated(id); onClose(); } catch { toast.error(t.common.errorBody); } finally { setBusy(false); }
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={f.title}
      footer={<><PillButton variant="secondary" onClick={onClose}>{t.common.cancel}</PillButton><PillButton onClick={submit} disabled={busy}>{busy ? t.common.working : f.create}</PillButton></>}>
      <div className="space-y-4">
        <SelectField label={f.type} value={type} onChange={(e) => setType(e.target.value as "incoming" | "outgoing")}><option value="incoming">{ins.types.incoming}</option><option value="outgoing">{ins.types.outgoing}</option></SelectField>
        <SelectField label={f.lease} value={leaseId} error={errs.lease} onChange={(e) => setLeaseId(e.target.value)}><option value="">{f.pickLease}</option>{(leases.data ?? []).filter((x) => x.state !== "ended").map((x) => <option key={x.id} value={x.id}>{`${x.tenantName} · ${x.place}`}</option>)}</SelectField>
        <TextField label={f.date} type="date" value={date} error={errs.date} onChange={(e) => setDate(e.target.value)} />
        <TextField label={f.inspector} value={inspector} onChange={(e) => setInspector(e.target.value)} />
      </div>
    </Modal>
  );
}

function InspectionPanel({ x, onClose, set }: { x: InspectionView | null; onClose: () => void; set: SetLeaseSearch }) {
  const dt = ins.detail;
  const [notes, setNotes] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = !!x && (x.state === "awaiting_signoff" || x.state === "signed");
  const unrated = x ? x.items - x.rated : 0;
  const send = async () => {
    if (!x) return;
    setBusy(true);
    try { await inspectionService.sendForSignoff(x.id); toast.success(fill(dt.sent, { name: x.tenantName })); } catch { toast.error(t.common.errorBody); } finally { setBusy(false); }
  };
  return (
    <SidePanel open={!!x} onOpenChange={(o) => { if (!o) { onClose(); setNotes(null); } }} title={x ? fill(dt.title, { type: ins.types[x.type], place: x.place }) : ""} wide
      footer={x ? <>
        {!locked && <PillButton variant="ghost" onClick={() => setDel(true)}>{dt.delete}</PillButton>}
        {x.envelopeId && <PillButton variant="secondary" onClick={() => set({ view: "signatures", id: x.envelopeId }, false)}>{dt.viewSig}</PillButton>}
        {!locked && <PillButton onClick={send} disabled={busy || unrated > 0} icon={<Send className="h-4 w-4" />}>{busy ? t.common.working : dt.send}</PillButton>}
      </> : undefined}>
      {x && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><TruncatedText text={x.tenantName} className="text-h3 text-ink-900" /><p className="text-[13px] text-ink-500">{formatDate(x.date)} · {x.inspector}</p></div>
            <InspStateChip s={x.state} />
          </div>
          {locked ? <p role="status" className="flex items-start gap-2 rounded-[5.75px] bg-olive-100 p-3 text-[13px] text-ink-900"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-olive-700" aria-hidden />{dt.locked}</p>
            : <p className="text-[13px] text-ink-500">{unrated > 0 ? fill(dt.unrated, { n: unrated }) + " · " : ""}{dt.sendHint}</p>}
          {x.type === "outgoing" && <Link to="/invoices" search={{ view: "deposits" }} className="inline-block text-[13px] font-medium text-olive-700 underline-offset-2 hover:underline">{dt.deposit}</Link>}
          <section className="space-y-3"><h3 className="text-overline text-ink-500">{dt.rooms}</h3>
            {x.rooms.map((r) => <RoomCard key={r.id} inspId={x.id} room={r} locked={locked} />)}
          </section>
          <section className="space-y-2">
            <TextAreaField label={dt.notes} placeholder={dt.notesPh} rows={3} disabled={locked} value={notes ?? x.notes} onChange={(e) => setNotes(e.target.value)} />
            {!locked && notes !== null && notes !== x.notes && <PillButton size="sm" variant="secondary" onClick={async () => { await inspectionService.setNotes(x.id, notes); setNotes(null); toast.success(dt.notesSaved); }}>{dt.saveNotes}</PillButton>}
          </section>
          <ConfirmDialog open={del} onOpenChange={setDel} title={dt.deleteTitle} body={dt.deleteBody} onConfirm={async () => { await inspectionService.remove(x.id); toast.success(dt.deleted); onClose(); }} />
        </div>
      )}
    </SidePanel>
  );
}

function RoomCard({ inspId, room, locked }: { inspId: string; room: InspectionView["rooms"][number]; locked: boolean }) {
  const dt = ins.detail;
  const input = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  const [notesOpen, setNotesOpen] = useState<string | null>(null);
  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    setErr("");
    let count = room.photos.length;
    for (const f of Array.from(files)) {
      if (count >= PHOTOS_PER_ROOM) { setErr(dt.photoMax); break; }
      if (!PHOTO_TYPES.includes(f.type)) { setErr(fill(dt.photoType, { name: f.name })); continue; }
      if (f.size > PHOTO_MAX) { setErr(fill(dt.photoSize, { name: f.name })); continue; }
      const url = await imageFileToDataUrl(f, 720, 0.72);
      await inspectionService.addPhoto(inspId, room.id, { name: f.name, url });
      count++;
    }
    if (input.current) input.current.value = "";
  };
  const rated = room.items.filter((i) => i.condition).length;
  return (
    <div className="space-y-3 rounded-[5.75px] border border-border-soft p-3">
      <div className="flex items-center justify-between gap-2"><h4 className="truncate text-[15px] font-semibold text-ink-900">{room.name}</h4><span className="shrink-0 text-[12px] tabular-nums text-ink-500">{rated}/{room.items.length}</span></div>
      <ul className="space-y-2">
        {room.items.map((it) => (
          <li key={it.id} className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 basis-32 truncate text-[14px] text-ink-900">{it.name}</span>
              <div role="radiogroup" aria-label={it.name} className="flex shrink-0 gap-1">
                {CONDITIONS.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={it.condition === c} disabled={locked}
                    onClick={() => inspectionService.setItem(inspId, room.id, it.id, { condition: it.condition === c ? undefined : c })}
                    className={cn("h-8 rounded-full px-2.5 text-[12px] font-medium transition-colors disabled:cursor-default",
                      it.condition === c ? (c === "poor" ? "bg-danger text-primary-foreground" : c === "fair" ? "bg-warning text-primary-foreground" : c === "na" ? "bg-ink-500 text-primary-foreground" : "bg-olive-700 text-primary-foreground") : "border border-border-soft bg-surface-solid text-ink-700 hover:bg-olive-100")}>
                    {ins.conditions[c]}
                  </button>
                ))}
              </div>
            </div>
            {notesOpen === it.id && !locked ? (
              <input autoFocus defaultValue={it.note} placeholder={dt.notePh} aria-label={`${dt.note} — ${it.name}`} onBlur={(e) => { inspectionService.setItem(inspId, room.id, it.id, { note: e.target.value.trim() }); setNotesOpen(null); }}
                className="h-10 w-full rounded-[5.75px] border border-input bg-surface-solid px-3 text-[14px] outline-none focus:border-olive-700" />
            ) : it.note ? <button type="button" disabled={locked} onClick={() => setNotesOpen(it.id)} className="block w-full min-w-0 text-left"><TruncatedText text={it.note} className="text-[12px] text-ink-500" /></button>
              : !locked && (it.condition === "fair" || it.condition === "poor") ? <button type="button" onClick={() => setNotesOpen(it.id)} className="text-[12px] font-medium text-olive-700 hover:underline">+ {dt.note}</button> : null}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {room.photos.map((p) => (
          <div key={p.id} className="relative h-16 w-16 overflow-hidden rounded-[3.45px] bg-olive-100">
            <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
            {!locked && <button type="button" aria-label={fill(dt.removePhoto, { name: p.name })} onClick={() => inspectionService.removePhoto(inspId, room.id, p.id)} className="absolute right-0.5 top-0.5 grid h-6 w-6 place-items-center rounded-full bg-olive-900/70 text-primary-foreground"><X className="h-3.5 w-3.5" /></button>}
          </div>
        ))}
        {!locked && room.photos.length < PHOTOS_PER_ROOM && (
          <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-[3.45px] border border-dashed border-olive-700/50 text-olive-700 hover:bg-olive-100 focus-within:ring-2 focus-within:ring-olive-700">
            <Camera className="h-5 w-5" aria-hidden /><span className="sr-only">{dt.addPhoto} — {room.name}</span>
            <input ref={input} type="file" accept={PHOTO_TYPES.join(",")} multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
          </label>
        )}
      </div>
      {!locked && <p className="text-[12px] text-ink-500">{dt.photoHint}</p>}
      {err && <p role="alert" className="text-[13px] text-danger">{err}</p>}
    </div>
  );
}
