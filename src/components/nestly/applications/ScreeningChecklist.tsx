import { useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Paperclip, X } from "lucide-react";
import { CHECK_KEYS, type CheckKey, type CheckResult, type FileMeta, type ScreeningCheck } from "@/mocks/leasing";
import type { ApplicationView } from "@/services";
import { StatusChip, TruncatedText, type Tone } from "@/components/nestly/primitives";
import { fill } from "@/components/nestly/properties/shared";
import { fmtSize } from "@/components/nestly/requests/shared";
import { ProgressRing, todayIso } from "@/components/nestly/leasing/shared";
import { REQUIRED_CHECKS, isComplete, type screeningProgress } from "@/lib/leasing-rules";
import { formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

const scr = t.apps.scr;
const RESULTS: CheckResult[] = ["pass", "concern", "fail"];
export const RESULT_TONE: Record<CheckResult, Tone> = { pass: "success", concern: "warning", fail: "danger" };
const FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const FILE_MAX = 10 * 1024 * 1024;

type Checks = Partial<Record<CheckKey, ScreeningCheck>>;
type Progress = ReturnType<typeof screeningProgress>;

/** Owner-run screening checklist: tick checks done outside Nestly, record result, date, notes and the external report. */
export function ScreeningChecklist({ app, checks, progress, locked, onChange }: { app: ApplicationView; checks: Checks; progress: Progress; locked: boolean; onChange: (key: CheckKey, c: ScreeningCheck) => void }) {
  const [open, setOpen] = useState<CheckKey | null>(null);
  const suggested = app.afford?.result;
  const hint = (k: CheckKey) => {
    if (k !== "affordability") return scr.hints[k];
    if (!app.afford) return scr.noIncome;
    return fill(scr.hints.affordability, { rent: formatZAR(app.rent), ratio: String(app.afford.ratio).replace(".", ","), result: scr.results[app.afford.result].toLowerCase() });
  };
  const tick = (k: CheckKey, on: boolean) => {
    const c = checks[k];
    if (!on) { onChange(k, { notes: c?.notes ?? "", ...c, done: false }); return; }
    onChange(k, { notes: "", ...c, done: true, result: c?.result ?? (k === "affordability" && suggested ? suggested : "pass"), date: c?.date ?? todayIso() });
  };
  const blocked = progress.failed.length ? t.apps.detail.readyFail : fill(t.apps.detail.readyBlocked, { items: progress.missing.map((k) => scr.items[k]).join(", ") });

  return (
    <section className="space-y-3" aria-labelledby="scr-title">
      <div className="flex items-center gap-4 rounded-[5.75px] bg-olive-100/60 p-3">
        <ProgressRing pct={progress.pct} ready={progress.canMarkReady} label={fill(scr.progress, { done: progress.done, total: progress.total })} />
        <div className="min-w-0 flex-1 space-y-1">
          <h3 id="scr-title" className="text-[15px] font-semibold text-ink-900">{scr.title}</h3>
          <p className="text-[13px] tabular-nums text-ink-700" aria-live="polite">{fill(scr.progress, { done: progress.done, total: progress.total })}</p>
          {progress.canMarkReady ? <StatusChip tone="success">{scr.readyBadge}</StatusChip>
            : <p className="text-[12px] text-ink-500">{progress.missing.length ? fill(scr.notReady, { n: progress.missing.length }) : ""}{progress.missing.length ? " · " : ""}<span className={progress.failed.length ? "text-danger" : ""}>{blocked}</span></p>}
        </div>
      </div>
      <p className="text-[12px] text-ink-500">{scr.note}</p>
      <ul className="space-y-2">
        {CHECK_KEYS.map((k) => {
          const c = checks[k];
          const done = !!c?.done;
          const complete = isComplete(c);
          const required = REQUIRED_CHECKS.includes(k);
          const expanded = open === k;
          return (
            <li key={k} className={cn("rounded-[5.75px] border p-3 transition-colors", complete ? "border-olive-700/30 bg-surface-solid" : "border-border-soft bg-surface-solid/70")}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={done} disabled={locked} onChange={(e) => tick(k, e.target.checked)} aria-label={`${scr.done}: ${scr.items[k]}`} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md accent-olive-700 disabled:cursor-default" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 text-[14px] font-medium text-ink-900">{scr.items[k]}</span>
                    <span className={cn("text-[11px] font-medium uppercase tracking-[0.04em]", required ? "text-olive-700" : "text-ink-500")}>{required ? scr.required : scr.optional}</span>
                  </div>
                  <TruncatedText text={hint(k)} lines={2} className="text-[12px] text-ink-500" />
                  {done && (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[12px] text-ink-500">
                      {c?.result ? <StatusChip tone={RESULT_TONE[c.result]}>{scr.results[c.result]}</StatusChip> : <span className="text-danger">{scr.resultReq}</span>}
                      {c?.date && <span className="tabular-nums">{formatDate(c.date)}</span>}
                      {c?.attachment && <span className="inline-flex min-w-0 max-w-full items-center gap-1"><Paperclip className="h-3 w-3 shrink-0" aria-hidden /><span className="truncate">{c.attachment.name}</span></span>}
                    </div>
                  )}
                  {c?.notes && !expanded && <TruncatedText text={c.notes} className="text-[12px] text-ink-700" />}
                </div>
                {!locked && (
                  <button type="button" aria-expanded={expanded} aria-label={`${expanded ? scr.collapse : scr.edit}: ${scr.items[k]}`} onClick={() => setOpen(expanded ? null : k)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-olive-100 hover:text-ink-900">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
                  </button>
                )}
              </div>
              {expanded && !locked && <CheckEditor k={k} c={c} suggested={k === "affordability" ? suggested : undefined} onChange={(n) => onChange(k, n)} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CheckEditor({ k, c, suggested, onChange }: { k: CheckKey; c?: ScreeningCheck | undefined; suggested?: CheckResult | undefined; onChange: (c: ScreeningCheck) => void }) {
  const [notes, setNotes] = useState(c?.notes ?? "");
  const [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const base: ScreeningCheck = { done: false, notes: "", ...c };
  const setResult = (r: CheckResult) => onChange({ ...base, done: true, result: r, date: base.date ?? todayIso(), notes });
  const attach = (f?: File) => {
    if (!f) return;
    if (!FILE_TYPES.includes(f.type)) { setErr(fill(scr.fileType, { name: f.name })); return; }
    if (f.size > FILE_MAX) { setErr(fill(scr.fileSize, { name: f.name })); return; }
    setErr("");
    const meta: FileMeta = { name: f.name, size: f.size, type: f.type };
    onChange({ ...base, notes, attachment: meta });
    toast.success(fill(scr.attached, { name: f.name }));
    if (file.current) file.current.value = "";
  };
  return (
    <div className="mt-3 space-y-3 border-t border-border-soft pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label={`${scr.result} — ${scr.items[k]}`} className="flex gap-1.5">
          {RESULTS.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={c?.result === r} onClick={() => setResult(r)}
              className={cn("h-9 rounded-full px-3.5 text-[13px] font-medium transition-colors", c?.result === r ? (r === "pass" ? "bg-olive-700 text-primary-foreground" : r === "concern" ? "bg-warning text-primary-foreground" : "bg-danger text-primary-foreground") : "border border-border-soft bg-surface-solid text-ink-900 hover:bg-olive-100")}>
              {scr.results[r]}
            </button>
          ))}
        </div>
        {suggested && c?.result !== suggested && <button type="button" onClick={() => setResult(suggested)} className="text-[12px] font-medium text-olive-700 hover:underline">{scr.useSuggested}</button>}
      </div>
      <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
        <label className="block space-y-1.5"><span className="block text-[13px] font-medium text-ink-900">{scr.date}</span>
          <input type="date" value={c?.date ?? ""} max={todayIso()} onChange={(e) => onChange({ ...base, notes, date: e.target.value || undefined })} className="h-10 w-full rounded-[5.75px] border border-input bg-surface-solid px-3 text-[14px] outline-none focus:border-olive-700" />
        </label>
        <label className="block min-w-0 space-y-1.5"><span className="block text-[13px] font-medium text-ink-900">{scr.notes}</span>
          <textarea rows={2} value={notes} placeholder={scr.notesPh} onChange={(e) => setNotes(e.target.value)} onBlur={() => { if (notes !== (c?.notes ?? "")) { onChange({ ...base, notes }); toast.success(scr.saved); } }}
            className="w-full resize-y rounded-[5.75px] border border-input bg-surface-solid px-3 py-2 text-[14px] outline-none focus:border-olive-700" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {c?.attachment ? (
          <span className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-border-soft bg-olive-100/60 py-1 pl-3 pr-1 text-[13px] text-ink-900">
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-olive-700" aria-hidden /><span className="truncate">{c.attachment.name}</span><span className="shrink-0 text-[12px] text-ink-500">{fmtSize(c.attachment.size)}</span>
            <button type="button" aria-label={scr.remove} onClick={() => onChange({ ...base, notes, attachment: undefined })} className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-danger/10 hover:text-danger"><X className="h-3.5 w-3.5" /></button>
          </span>
        ) : (
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-olive-700/30 bg-surface-solid px-3.5 text-[13px] font-medium text-olive-900 hover:bg-olive-200 focus-within:ring-2 focus-within:ring-olive-700">
            <Paperclip className="h-3.5 w-3.5" aria-hidden />{scr.attach}
            <input ref={file} type="file" accept=".pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => attach(e.target.files?.[0])} />
          </label>
        )}
        <span className="text-[12px] text-ink-500">{scr.attachHint}</span>
      </div>
      {err && <p role="alert" className="text-[13px] text-danger">{err}</p>}
    </div>
  );
}
