import { useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { FileText, Lock, Star } from "lucide-react";
import { REQ_STATUSES } from "@/mocks/maintenance";
import type { Attachment, MaintRequest, Priority, ReqStatus, ThreadMsg } from "@/services";
import { StatusChip, TruncatedText, type Tone } from "@/components/nestly/primitives";
import { NAvatar } from "@/components/nestly/composites";
import { fill } from "@/components/nestly/properties/shared";
import { countByCategory, statusIndex } from "@/lib/maintenance-rules";
import { readSession } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

const r = t.req;
export const STATUS_TONE: Record<ReqStatus, Tone> = { new: "info", acknowledged: "neutral", assigned: "info", in_progress: "warning", awaiting_quote: "warning", resolved: "success", closed: "strong" };
export const PRIORITY_TONE: Record<Priority, Tone> = { low: "neutral", medium: "info", high: "warning", urgent: "danger" };
export const ReqStatusChip = ({ s }: { s: ReqStatus }) => <StatusChip tone={STATUS_TONE[s]} dot>{r.statuses[s]}</StatusChip>;
export const PriorityChip = ({ p }: { p: Priority }) => <StatusChip tone={PRIORITY_TONE[p]}>{r.priorities[p]}</StatusChip>;

export const actorName = () => readSession()?.name || "Janice Tinto";
export const fmtDateTime = (iso: string) => `${formatDate(iso)}, ${new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
export const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

/** Status pipeline with reached steps and the date each was reached. */
export function StatusPipeline({ req }: { req: Pick<MaintRequest, "status" | "timeline"> }) {
  const cur = statusIndex(req.status);
  return (
    <ol className="relative space-y-3 pl-6" aria-label={r.detail.timeline}>
      <span aria-hidden className="absolute bottom-1 left-[7px] top-1 w-px bg-border-soft" />
      {REQ_STATUSES.map((s, i) => {
        const ev = [...req.timeline].reverse().find((e) => e.status === s);
        const reached = i <= cur;
        return (
          <li key={s} className="relative min-w-0" aria-current={i === cur ? "step" : undefined}>
            <span aria-hidden className={cn("absolute -left-6 top-0.5 h-[15px] w-[15px] rounded-full border-[3px] border-surface-solid", i === cur ? "bg-olive-700 ring-2 ring-olive-200" : reached ? "bg-olive-500" : "bg-olive-100")} />
            <p className={cn("text-[14px]", reached ? "font-medium text-ink-900" : "text-ink-500")}>{r.statuses[s]}</p>
            {ev && <p className="text-[12px] text-ink-500">{fmtDateTime(ev.at)} · {ev.by}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export function AttachmentThumbs({ items, onRemove }: { items: Attachment[]; onRemove?: (id: string) => void }) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {items.map((a) => (
        <li key={a.id} className="relative min-w-0">
          <div className="aspect-square overflow-hidden rounded-[5.75px] border border-border-soft bg-olive-100">
            {a.url ? <img src={a.url} alt={a.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-olive-700"><FileText className="h-7 w-7" aria-hidden /></div>}
          </div>
          <TruncatedText text={a.name} className="mt-1 block text-[11px] text-ink-500" />
          <span className="block text-[11px] text-ink-500">{fmtSize(a.size)}</span>
          {onRemove && (
            <button type="button" aria-label={fill(r.photos.remove, { name: a.name })} onClick={() => onRemove(a.id)}
              className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-surface-solid text-[14px] text-ink-900 shadow-soft hover:bg-olive-100">×</button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function Thread({ msgs, viewer }: { msgs: ThreadMsg[]; viewer: "tenant" | "staff" }) {
  if (!msgs.length) return <p className="text-[13px] text-ink-500">{r.detail.noMsgs}</p>;
  return (
    <ul className="space-y-3">
      {msgs.map((m) => {
        const mine = m.from === viewer;
        return (
          <li key={m.id} className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
            <NAvatar name={m.by} size={28} />
            <div className={cn("max-w-[80%] min-w-0 rounded-[8.05px] px-3 py-2 text-[14px]",
              m.internal ? "border border-dashed border-warning/50 bg-warning/10 text-ink-900" : mine ? "bg-olive-700 text-primary-foreground" : "bg-olive-100 text-ink-900")}>
              {m.internal && <span className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-warning"><Lock className="h-3 w-3" aria-hidden />{r.detail.internalChip}</span>}
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={cn("mt-1 text-[11px]", mine && !m.internal ? "text-primary-foreground/75" : "text-ink-500")}>{m.by} · {fmtDateTime(m.at)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function Stars({ value, onChange, size = 28 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div className="flex gap-1" role={onChange ? "radiogroup" : "img"} aria-label={fill(r.rate.star, { n: value })}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = <Star style={{ width: size, height: size }} className={n <= value ? "fill-warning text-warning" : "text-ink-500/40"} aria-hidden />;
        return onChange ? <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={fill(r.rate.star, { n })} onClick={() => onChange(n)} className="rounded-full p-0.5 transition hover:scale-110">{icon}</button> : <span key={n}>{icon}</span>;
      })}
    </div>
  );
}

function CatTip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-[3.45px] bg-olive-900 px-3 py-2 text-[12px] text-primary-foreground shadow-soft"><div className="font-medium">{label}</div><div className="tabular-nums">{fill(r.chartTip, { n: payload[0]?.value ?? 0 })}</div></div>;
}
export function CategoryChart({ items }: { items: Pick<MaintRequest, "category">[] }) {
  const [active, setActive] = useState<number | null>(null);
  const data = countByCategory(items).map((c) => ({ label: r.categoryShort[c.category], value: c.count }));
  return (
    <div className="h-44 w-full" role="img" aria-label={r.chartTitle}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 0, left: -24, bottom: 0 }} onMouseLeave={() => setActive(null)}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-500)", fontSize: 12 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--ink-500)", fontSize: 11 }} />
          <RTooltip cursor={false} content={<CatTip />} />
          <Bar dataKey="value" radius={[3, 3, 3, 3]} barSize={22} onMouseEnter={(_, i) => setActive(i)} onClick={(_, i) => setActive(i)}>
            {data.map((_, i) => <Cell key={i} fill={active === i ? "var(--olive-700)" : "var(--olive-500)"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
