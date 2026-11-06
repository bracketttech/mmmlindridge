import { useState, type ReactNode } from "react";
import { Area, ComposedChart, Bar, BarChart, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis, Cell } from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatZAR, formatCompactZAR } from "@/lib/format";
import { CardMenu, GlassCard, Skel, EmptyState } from "./primitives";

const OLIVE = "var(--olive-500)";
const OLIVE_DARK = "var(--olive-700)";
const OLIVE_SOFT = "var(--olive-200)";

type TipPayload = { name?: string; value?: number; dataKey?: string | number; color?: string };
function ChipTooltip({ active, payload, label, names, format = formatZAR }: { active?: boolean; payload?: TipPayload[]; label?: string; names?: Record<string, string>; format?: (n: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[3.45px] bg-olive-900 px-3 py-2 text-[12px] text-primary-foreground shadow-soft">
      <div className="mb-0.5 font-medium">{label}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2 tabular-nums">
          <span className="opacity-70">{names?.[String(p.dataKey)] ?? p.name}</span>
          <span className="ml-auto">{format(Number(p.value))}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({ title, sub, children, state = "ready", action }: { title: string; sub?: string; children: ReactNode; state?: "ready" | "loading" | "empty" | "error"; action?: ReactNode }) {
  return (
    <GlassCard className="flex min-w-0 flex-col">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-h3 text-ink-900">{title}</h3>
          {sub && <p className="truncate text-[12px] text-ink-500">{sub}</p>}
        </div>
        {action ?? <CardMenu />}
      </div>
      {state === "loading" ? <Skel className="h-48 w-full" /> : state === "empty" ? <EmptyState body="No data for this period." /> : state === "error" ? <EmptyState tone="error" title="Chart unavailable" body="We couldn't load this chart." /> : children}
    </GlassCard>
  );
}

export function AreaComparisonChart({ data, names = { collected: "Collected", previous: "Last year" } }: { data: { month: string; collected: number; previous: number }[]; names?: { collected: string; previous: string } }) {
  return (
    <div className="h-56 w-full" role="img" aria-label={`${names.collected} per month compared with ${names.previous.toLowerCase()}`}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="oliveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--olive-500)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--olive-500)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tickFormatter={(v) => String(v).slice(0, 3)} interval="preserveStartEnd" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-500)", fontSize: 12 }} />
          <YAxis domain={[(min: number) => Math.floor(min * 0.85), "auto"]} tickLine={false} axisLine={false} width={56} tick={{ fill: "var(--ink-500)", fontSize: 11 }} tickFormatter={formatCompactZAR} />
          <RTooltip cursor={{ stroke: OLIVE, strokeDasharray: "3 3" }} content={<ChipTooltip names={names} />} />
          <Area type="monotone" dataKey="collected" stroke={OLIVE_DARK} strokeWidth={2} fill="url(#oliveFill)" activeDot={{ r: 5, fill: OLIVE_DARK, stroke: "white", strokeWidth: 2 }} />
          <Line type="monotone" dataKey="previous" stroke="var(--ink-500)" strokeDasharray="5 5" dot={false} activeDot={false} strokeWidth={1.5} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TickBarChart({ data, name = "Collected", format }: { data: { label: string; value: number }[]; name?: string; format?: (n: number) => string }) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="h-56 w-full" role="img" aria-label={`${name} bar chart`}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 0, left: -8, bottom: 0 }} onMouseLeave={() => setActive(null)}>
          <XAxis dataKey="label" tickFormatter={(v) => String(v).slice(0, 3)} tickLine={false} axisLine={false} tick={{ fill: "var(--ink-500)", fontSize: 12 }} />
          <YAxis hide />
          <RTooltip cursor={false} content={<ChipTooltip names={{ value: name }} format={format} />} />
          <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={10} onMouseEnter={(_, i) => setActive(i)} onClick={(_, i) => setActive(i)}>
            {data.map((_, i) => (
              <Cell key={i} fill={active === i ? OLIVE_DARK : i === data.length - 1 ? OLIVE : OLIVE_SOFT} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GaugeChart({ value, label, detail }: { value: number; label: string; detail: string }) {
  const [open, setOpen] = useState(false);
  const r = 80;
  const c = Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center">
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button type="button" aria-label={`${label}: ${pct}%. ${detail}`} onClick={() => setOpen((o) => !o)} className="rounded-[5.75px]">
            <svg viewBox="0 0 200 110" className="w-56 max-w-full">
              <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={OLIVE_SOFT} strokeWidth="16" strokeLinecap="round" />
              <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={OLIVE_DARK} strokeWidth="16" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: "stroke-dashoffset 1s ease" }} />
              <text x="100" y="92" textAnchor="middle" className="fill-ink-900" style={{ fontSize: 30 }}>{pct}%</text>
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent>{detail}</TooltipContent>
      </Tooltip>
      <p className="text-[13px] text-ink-500">{label}</p>
    </div>
  );
}

/* Mini visuals for KPI tiles (with tooltips) */
export function MiniDonut({ value, tip }: { value: number; tip: string }) {
  const r = 18, c = 2 * Math.PI * r;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={tip} className="shrink-0 rounded-full">
          <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
            <circle cx="24" cy="24" r={r} fill="none" stroke={OLIVE_SOFT} strokeWidth="6" />
            <circle cx="24" cy="24" r={r} fill="none" stroke={OLIVE} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
          </svg>
        </button>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

export function MiniSpark({ points, tip }: { points: number[]; tip: string }) {
  const max = Math.max(...points), min = Math.min(...points);
  const d = points.map((p, i) => `${(i / (points.length - 1)) * 60},${22 - ((p - min) / (max - min || 1)) * 18}`).join(" L");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={tip} className="shrink-0 rounded-md">
          <svg viewBox="0 0 64 26" className="h-8 w-16"><path d={`M${d}`} fill="none" stroke="var(--ink-900)" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

export function MiniTicks({ values, tip }: { values: number[]; tip: string }) {
  const max = Math.max(...values);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={tip} className="flex h-10 shrink-0 items-end gap-[3px] rounded-md">
          {values.map((v, i) => (
            <span key={i} className="w-[3px] rounded-full bg-olive-500" style={{ height: `${20 + (v / max) * 80}%`, opacity: 0.45 + (i / values.length) * 0.55 }} />
          ))}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
