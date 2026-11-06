import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CalendarCheck, Eraser, Eye, FileSignature, Mail, PenLine, Send, ShieldCheck, Ban, XCircle, Bell, CheckCircle2, Clock } from "lucide-react";
import type { AuditEvent, AuditKind, EnvStatus, FieldType, InspState, Signer, SignField, TemplateSection } from "@/mocks/leasing";
import type { LeaseDisplay } from "@/lib/leasing-rules";
import { StatusChip, TruncatedText, type Tone } from "@/components/nestly/primitives";
import { fill } from "@/components/nestly/properties/shared";
import { fmtDateTime } from "@/components/nestly/requests/shared";
import { formatDate, initials } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

export const l = t.lease;
export const sg = t.lease.sig;
export const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const ENV_TONE: Record<EnvStatus, Tone> = { draft: "neutral", sent: "info", viewed: "warning", signed: "success", declined: "danger", expired: "danger", voided: "neutral" };
export const EnvStatusChip = ({ s }: { s: EnvStatus }) => <StatusChip tone={ENV_TONE[s]} dot>{sg.statuses[s]}</StatusChip>;
const LEASE_TONE: Record<LeaseDisplay, Tone> = { draft: "neutral", active: "success", expiring: "warning", month_to_month: "info", ended: "neutral" };
export const LeaseChip = ({ s }: { s: LeaseDisplay }) => <StatusChip tone={LEASE_TONE[s]} dot>{l.display[s]}</StatusChip>;
const INSP_TONE: Record<InspState, Tone> = { scheduled: "neutral", in_progress: "warning", awaiting_signoff: "info", signed: "success" };
export const InspStateChip = ({ s }: { s: InspState }) => <StatusChip tone={INSP_TONE[s]} dot>{l.insp.states[s]}</StatusChip>;
const SIGNER_TONE: Record<Signer["state"], Tone> = { pending: "neutral", viewed: "warning", signed: "success", declined: "danger" };
export const SignerChip = ({ s }: { s: Signer["state"] }) => <StatusChip tone={SIGNER_TONE[s]} dot>{sg.signerStates[s]}</StatusChip>;

export const daysLeftLabel = (n: number, end: string) => (n < 0 ? fill(l.ended, { date: formatDate(end) }) : n === 0 ? l.endsToday : n === 1 ? l.dayLeft : fill(l.daysLeft, { n }));

/* ---------- Signature rendering ---------- */
export function SignatureMark({ value, name, className }: { value?: string | undefined; name: string; className?: string }) {
  if (!value) return null;
  if (value.startsWith("typed:")) return <span className={cn("block truncate text-[22px] font-light italic leading-none tracking-tight text-olive-900", className)}>{value.slice(6) || name}</span>;
  return <img src={value} alt={fill(sg.signedBy, { name })} className={cn("h-10 max-w-full object-contain", className)} />;
}

/** Draw-with-finger signature pad. Emits a PNG data URL, or null when cleared. */
export function SignaturePad({ onChange, label }: { onChange: (v: string | null) => void; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    c.width = r.width * ratio; c.height = r.height * ratio;
    const ctx = c.getContext("2d")!; ctx.scale(ratio, ratio); ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = getComputedStyle(c).color;
  }, []);
  const pos = (e: ReactPointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => { e.currentTarget.setPointerCapture(e.pointerId); drawing.current = true; const ctx = e.currentTarget.getContext("2d")!; const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke(); };
  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const ctx = e.currentTarget.getContext("2d")!; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); };
  const up = () => { if (!drawing.current) return; drawing.current = false; setEmpty(false); onChange(ref.current!.toDataURL("image/png")); };
  const clear = () => { const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); setEmpty(true); onChange(null); };
  return (
    <div className="space-y-2">
      <div className="relative">
        <canvas ref={ref} aria-label={label} role="img" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          className="h-44 w-full touch-none rounded-[5.75px] border border-dashed border-olive-700/50 bg-surface-solid text-olive-900" />
        {empty && <span aria-hidden className="pointer-events-none absolute inset-x-6 bottom-10 border-b border-ink-500/30" />}
        {empty && <span className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-[13px] text-ink-500">{t.sign.pad.drawHint}</span>}
      </div>
      <button type="button" onClick={clear} disabled={empty} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium text-olive-700 hover:bg-olive-100 disabled:opacity-40"><Eraser className="h-3.5 w-3.5" aria-hidden />{t.sign.pad.clear}</button>
    </div>
  );
}

/* ---------- Document with fields ---------- */
const FIELD_ICON: Record<FieldType, typeof PenLine> = { signature: PenLine, initial: FileSignature, date: CalendarCheck };
export function FieldBox({ f, signer, highlight, onRemove, showValue }: { f: SignField; signer?: Signer | undefined; highlight?: boolean; onRemove?: () => void; showValue?: boolean }) {
  const Icon = FIELD_ICON[f.type];
  const signed = showValue && signer?.state === "signed";
  const style = { left: `${Math.min(Math.max(f.x, 0), 70)}%`, top: `${Math.max(0, f.y)}px` };
  const label = fill(l.prep.fields.remove, { type: sg.fields[f.type].toLowerCase(), name: signer?.name ?? "" });
  const body = signed ? (
    f.type === "signature" ? <SignatureMark value={signer!.signature} name={signer!.name} className="text-[15px]" />
      : f.type === "initial" ? <span className="text-[15px] font-light italic text-olive-900">{initials(signer!.name)}</span>
      : <span className="text-[12px] tabular-nums text-ink-900">{formatDate(signer!.signedAt!)}</span>
  ) : <span className="flex min-w-0 items-center gap-1 text-[11px] font-medium"><Icon className="h-3 w-3 shrink-0" aria-hidden /><span className="truncate">{sg.fields[f.type]}{signer ? ` · ${signer.name.split(" ")[0]}` : ""}</span></span>;
  const cls = cn("absolute flex h-9 w-[28%] min-w-[96px] max-w-[180px] items-center rounded-[3.45px] border px-2",
    signed ? "border-transparent bg-transparent" : highlight ? "border-olive-700 bg-olive-200/80 text-olive-900 ring-2 ring-olive-700/30" : "border-dashed border-olive-700/50 bg-olive-100/80 text-olive-900");
  if (onRemove) return <button type="button" aria-label={label} title={label} onClick={(e) => { e.stopPropagation(); onRemove(); }} className={cn(cls, "hover:border-danger hover:bg-danger/10")} style={style}>{body}</button>;
  return <div className={cls} style={style}>{body}</div>;
}

/** Height of a section's signing strip so every field fits. */
export const stripHeight = (fs: Pick<SignField, "y">[]) => Math.max(100, ...fs.map((f) => f.y + 44));

/** Paper-style rendering of a document's sections with its signing fields laid over them. */
export function DocumentView({ title, pages, fields, signers, highlightSignerId, showValues = false, mark, footer }: {
  title: string; pages: TemplateSection[]; fields: SignField[]; signers: Signer[]; highlightSignerId?: string | undefined; showValues?: boolean; mark?: string | undefined; footer?: React.ReactNode;
}) {
  return (
    <article className="relative overflow-hidden rounded-[5.75px] border border-border-soft bg-surface-solid p-4 text-ink-900 shadow-soft sm:p-6">
      {mark && <span aria-hidden className="pointer-events-none absolute right-3 top-3 rotate-6 rounded-[3.45px] border-2 border-olive-700/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-olive-700/70">{mark}</span>}
      <h2 className="mb-4 pr-20 text-h3">{title}</h2>
      <ol className="space-y-3">
        {pages.map((p, i) => {
          const fs = fields.filter((f) => f.page === i);
          return (
            <li key={p.id} className="relative rounded-[3.45px]">
              <h3 className="text-[14px] font-semibold">{p.heading}</h3>
              <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink-700">{p.body}</p>
              {fs.length > 0 && <div className="relative mt-2" style={{ height: stripHeight(fs) }}>{fs.map((f) => <FieldBox key={f.id} f={f} signer={signers.find((s) => s.id === f.signerId)} highlight={f.signerId === highlightSignerId} showValue={showValues} />)}</div>}
            </li>
          );
        })}
      </ol>
      {footer}
    </article>
  );
}

/** Certificate page appended to a completed document's signed PDF preview. */
export function Certificate({ signers, audit }: { signers: Signer[]; audit: AuditEvent[] }) {
  return (
    <section className="mt-6 space-y-3 border-t border-border-soft pt-4">
      <h3 className="flex items-center gap-2 text-[14px] font-semibold"><ShieldCheck className="h-4 w-4 text-olive-700" aria-hidden />{sg.certTitle}</h3>
      <p className="text-[13px] text-ink-500">{sg.certBody}</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {signers.map((s) => {
          const ev = [...audit].reverse().find((a) => a.kind === "signed" && a.actor === s.name);
          return (
            <li key={s.id} className="min-w-0 rounded-[3.45px] border border-border-soft p-3">
              <SignatureMark value={s.signature} name={s.name} />
              <TruncatedText text={`${s.name} · ${sg.roles[s.role]}`} className="mt-1 text-[13px] font-medium" />
              <p className="text-[12px] text-ink-500">{s.signedAt ? `${fmtDateTime(s.signedAt)} · ${sg.method[s.method ?? "type"]}` : sg.signerStates[s.state]}</p>
              {ev?.ip && <p className="text-[12px] text-ink-500">{fill(sg.panel.ip, { ip: ev.ip })} · {ev.device}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- Audit trail ---------- */
const AUDIT_ICON: Record<AuditKind, typeof Mail> = { created: FileSignature, sent: Send, viewed: Eye, signed: PenLine, declined: XCircle, reminded: Bell, expired: Clock, completed: CheckCircle2, voided: Ban };
export function AuditTrail({ events }: { events: AuditEvent[] }) {
  return (
    <ol className="space-y-3">
      {[...events].reverse().map((e) => {
        const Icon = AUDIT_ICON[e.kind];
        return (
          <li key={e.id} className="flex min-w-0 gap-3">
            <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", e.kind === "declined" || e.kind === "voided" ? "bg-danger/12 text-danger" : e.kind === "completed" || e.kind === "signed" ? "bg-olive-200 text-olive-900" : "bg-olive-100 text-olive-700")}><Icon className="h-4 w-4" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] text-ink-900"><span className="font-medium">{sg.audit[e.kind]}</span> · <span className="text-ink-700">{e.actor}</span></p>
              <p className="text-[12px] tabular-nums text-ink-500">{fmtDateTime(e.at)}{e.ip ? ` · ${fill(sg.panel.ip, { ip: e.ip })}` : ""}{e.device ? ` · ${e.device}` : ""}</p>
              {e.note && <TruncatedText text={e.kind === "signed" && e.note in sg.method ? fill(sg.methodNote, { method: sg.method[e.note as keyof typeof sg.method] }) : e.note} lines={2} className="text-[12px] text-ink-500" />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Progress ring ---------- */
export function ProgressRing({ pct, size = 72, label, ready = false }: { pct: number; size?: number; label: string; ready?: boolean }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} className="stroke-olive-100" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className={cn("transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none", ready ? "stroke-olive-700" : "stroke-olive-500")} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[15px] font-semibold tabular-nums text-ink-900">{ready ? <CheckCircle2 className="h-6 w-6 text-olive-700" aria-hidden /> : `${pct}%`}</span>
    </div>
  );
}

export const copyText = async (text: string) => { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } };
export const signUrl = (token: string) => `${typeof window === "undefined" ? "" : window.location.origin}/sign/${token}`;
