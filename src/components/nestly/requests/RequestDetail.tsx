import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Clock, MapPin, Send } from "lucide-react";
import { REQ_STATUSES } from "@/mocks/maintenance";
import { contractorService, requestService, staffService, type MaintRequest, type ReqStatus } from "@/services";
import { PillButton, SegmentedChips, StatusChip, TruncatedText } from "@/components/nestly/primitives";
import { Modal, NAvatar } from "@/components/nestly/composites";
import { SelectField, TextAreaField } from "@/components/nestly/forms";
import { TextField } from "@/components/nestly/auth";
import { fill } from "@/components/nestly/properties/shared";
import { useData } from "@/lib/use-data";
import { formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { AttachmentThumbs, PriorityChip, ReqStatusChip, StatusPipeline, Stars, Thread, actorName, fmtDateTime } from "./shared";

const r = t.req;
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="space-y-2"><h3 className="text-overline text-ink-500">{title}</h3>{children}</section>;

/** Owner / caretaker request detail (right rail). */
export function RequestDetail({ req, place }: { req: MaintRequest; place: string }) {
  const staff = useData(() => staffService.list(), []);
  const contractors = useData(() => contractorService.list(), []);
  const [mode, setMode] = useState<"public" | "internal">("public");
  const [msg, setMsg] = useState("");
  const [cost, setCost] = useState(req.cost != null ? String(req.cost) : "");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [decide, setDecide] = useState(false);
  const me = actorName();
  const caretakers = (staff.data ?? []).filter((s) => s.role === "caretaker");

  const run = async (p: Promise<unknown>, ok: string) => { try { await p; toast.success(ok); } catch { toast.error(t.common.errorBody); } };
  const onAssign = (v: string) => {
    if (!v) return run(requestService.assign(req.id, undefined, me), r.detail.assigned);
    const [kind, id] = v.split(":") as ["staff" | "contractor", string];
    const name = kind === "staff" ? caretakers.find((s) => s.id === id)?.name : contractors.data?.find((c) => c.id === id)?.company;
    return run(requestService.assign(req.id, { kind, id, name: name ?? "" }, me), r.detail.assigned);
  };
  const send = async () => {
    if (!msg.trim()) return;
    await run(requestService.addMessage(req.id, msg.trim(), mode === "internal", me, "staff"), r.detail.sent);
    setMsg("");
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2"><span className="text-[12px] font-medium text-ink-500">{req.ref}</span><StatusChip>{r.categoryShort[req.category]}</StatusChip><PriorityChip p={req.priority} /></div>
        <h2><TruncatedText text={req.title} lines={2} className="text-h2 text-ink-900" /></h2>
        <div className="flex items-center gap-2">
          <NAvatar name={req.tenantName} size={32} />
          <div className="min-w-0 flex-1"><TruncatedText text={req.tenantName} className="text-[14px] font-medium text-ink-900" /><p className="flex min-w-0 items-center gap-1 text-[12px] text-ink-500"><MapPin className="h-3 w-3 shrink-0" aria-hidden /><TruncatedText text={place} /></p></div>
        </div>
      </div>

      <p className="whitespace-pre-wrap break-words text-[14px] text-ink-900">{req.description}</p>
      <div className="grid gap-2 text-[13px] text-ink-500 sm:grid-cols-2">
        <span className="flex min-w-0 items-center gap-1.5"><Clock className="h-3.5 w-3.5 shrink-0" aria-hidden /><TruncatedText text={fill(r.detail.logged, { date: fmtDateTime(req.createdAt) })} /></span>
        <span className="flex min-w-0 items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden /><TruncatedText text={req.moveOutDate ? `${r.detail.moveOut}: ${formatDate(req.moveOutDate)}` : `${r.detail.access}: ${req.access}`} /></span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label={r.detail.status} value={req.status} onChange={(e) => run(requestService.setStatus(req.id, e.target.value as ReqStatus, me), r.detail.statusChanged)}>
          {REQ_STATUSES.map((s) => <option key={s} value={s}>{r.statuses[s]}</option>)}
        </SelectField>
        <SelectField label={r.detail.assign} value={req.assignee ? `${req.assignee.kind}:${req.assignee.id}` : ""} onChange={(e) => onAssign(e.target.value)}>
          <option value="">{r.detail.none}</option>
          <optgroup label={r.detail.caretakers}>{caretakers.map((s) => <option key={s.id} value={`staff:${s.id}`}>{s.name}</option>)}</optgroup>
          <optgroup label={r.detail.contractors}>{(contractors.data ?? []).map((c) => <option key={c.id} value={`contractor:${c.id}`}>{c.company} — {c.trade}</option>)}</optgroup>
        </SelectField>
      </div>

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1"><TextField label={r.detail.cost} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d.,]/g, ""))} /></div>
        <PillButton variant="secondary" onClick={() => run(requestService.setCost(req.id, cost ? Number(cost.replace(",", ".")) : undefined), r.detail.costSaved)}>{r.detail.saveCost}</PillButton>
      </div>

      <Section title={r.quote.title}>
        {req.quote ? (
          <div className="flex flex-wrap items-center gap-3 rounded-[5.75px] border border-border-soft p-3">
            <div className="min-w-0 flex-1"><TruncatedText text={req.quote.contractorName} className="text-[14px] font-medium text-ink-900" /><TruncatedText text={`${formatZAR(req.quote.amount)} · ${req.quote.note}`} className="text-[13px] text-ink-500" /></div>
            <StatusChip tone={req.quote.status === "approved" ? "success" : req.quote.status === "declined" ? "danger" : "warning"} dot>{r.quote[req.quote.status]}</StatusChip>
            {req.quote.status === "pending" && (canApproveSpend(access.perms, req.quote.amount, access.member?.spendLimit) ? <PillButton size="sm" onClick={() => setDecide(true)}>{r.quote.approveTitle}</PillButton> : <p className="w-full text-[12px] text-warning-ink">{fill(t.staffAdmin.overLimit, { limit: formatZAR(access.member?.spendLimit ?? 0) })}</p>)}
          </div>
        ) : null}
        {(!req.quote || req.quote.status === "declined") && <PillButton variant="secondary" size="sm" onClick={() => setQuoteOpen(true)}>{r.quote.request}</PillButton>}
      </Section>

      {req.attachments.length > 0 && <Section title={r.detail.attachments}><AttachmentThumbs items={req.attachments} /></Section>}
      {req.rating && <Section title={r.rate.yours}><Stars value={req.rating.stars} size={18} />{req.rating.comment && <p className="text-[13px] text-ink-500">“{req.rating.comment}”</p>}</Section>}

      <Section title={r.detail.thread}>
        <Thread msgs={req.thread} viewer="staff" />
        <div className={cn("space-y-2 rounded-[5.75px] border p-3", mode === "internal" ? "border-dashed border-warning/50 bg-warning/5" : "border-border-soft")}>
          <SegmentedChips label={r.detail.thread} value={mode} onChange={setMode} options={[{ value: "public", label: r.detail.tenantVisible }, { value: "internal", label: r.detail.internal }]} />
          <textarea aria-label={mode === "internal" ? r.detail.internal : r.detail.tenantVisible} value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} placeholder={mode === "internal" ? r.detail.notePh : r.detail.msgPh}
            className="w-full resize-none rounded-[5.75px] border border-input bg-surface-solid px-3 py-2 text-[14px] outline-none focus:border-olive-700" />
          <div className="flex justify-end"><PillButton size="sm" disabled={!msg.trim()} onClick={send} icon={<Send className="h-3.5 w-3.5" />}>{r.detail.send}</PillButton></div>
        </div>
      </Section>

      <Section title={r.detail.timeline}><StatusPipeline req={req} /></Section>

      <QuoteDialog open={quoteOpen} onOpenChange={setQuoteOpen} reqId={req.id} contractors={contractors.data ?? []} />
      <Modal open={decide} onOpenChange={setDecide} title={r.quote.approveTitle}
        footer={<>
          <PillButton variant="ghost" onClick={async () => { await run(requestService.decideQuote(req.id, false, me), r.quote.declinedToast); setDecide(false); }}>{r.quote.decline}</PillButton>
          <PillButton onClick={async () => { await run(requestService.decideQuote(req.id, true, me), r.quote.approvedToast); setDecide(false); }}>{r.quote.approve}</PillButton>
        </>}>
        {req.quote && <div className="space-y-2"><p className="text-[14px] text-ink-900">{fill(r.quote.body, { company: req.quote.contractorName, amount: formatZAR(req.quote.amount) })}</p><p className="text-[13px] text-ink-500">{req.quote.note}</p></div>}
      </Modal>
    </div>
  );
}

function QuoteDialog({ open, onOpenChange, reqId, contractors }: { open: boolean; onOpenChange: (o: boolean) => void; reqId: string; contractors: { id: string; company: string; trade: string }[] }) {
  const [c, setC] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string>();
  const save = async () => {
    const n = Number(amount.replace(",", "."));
    if (!(n > 0)) return setErr(r.quote.amountErr);
    await requestService.requestQuote(reqId, c || contractors[0]!.id, n, note.trim(), actorName());
    toast.success(r.quote.added); onOpenChange(false); setAmount(""); setNote(""); setErr(undefined);
  };
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={r.quote.request} footer={<><PillButton variant="ghost" onClick={() => onOpenChange(false)}>{r.cancel}</PillButton><PillButton onClick={save}>{r.quote.save}</PillButton></>}>
      <div className="space-y-3">
        <SelectField label={r.quote.contractor} value={c || contractors[0]?.id || ""} onChange={(e) => setC(e.target.value)}>{contractors.map((x) => <option key={x.id} value={x.id}>{x.company} — {x.trade}</option>)}</SelectField>
        <TextField label={r.quote.amount} inputMode="decimal" value={amount} error={err} onChange={(e) => { setAmount(e.target.value.replace(/[^\d.,]/g, "")); setErr(undefined); }} />
        <TextAreaField label={r.quote.note} value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
      </div>
    </Modal>
  );
}
