import { useRef, useState, type CSSProperties, type ReactNode, type ButtonHTMLAttributes, type MouseEvent } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { MoreHorizontal, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertTriangle, XCircle, Info, Clock, Inbox, AlertOctagon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { t } from "@/lib/strings";

/* ---------- Truncate + tooltip (hover, focus, long-press) ---------- */
export function TruncatedText({ text, lines = 1, className, as: As = "span" }: { text: string; lines?: 1 | 2 | 3; className?: string; as?: "span" | "p" | "h3" | "div" }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const clamp = lines === 1 ? "truncate" : lines === 2 ? "line-clamp-2" : "line-clamp-3";
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <As
          tabIndex={0}
          className={cn("block min-w-0 rounded-sm", clamp, className)}
          onTouchStart={() => (timer.current = setTimeout(() => setOpen(true), 450))}
          onTouchEnd={() => clearTimeout(timer.current)}
          onTouchMove={() => clearTimeout(timer.current)}
        >
          {text}
        </As>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

/* ---------- Ripple hook (mobile tap) ---------- */
export function useRipple() {
  return (e: MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const s = document.createElement("span");
    const size = Math.max(r.width, r.height) / 2;
    s.className = "ripple-span";
    Object.assign(s.style, { width: `${size}px`, height: `${size}px`, left: `${e.clientX - r.left - size / 2}px`, top: `${e.clientY - r.top - size / 2}px` });
    el.appendChild(s);
    setTimeout(() => s.remove(), 650);
  };
}

/* ---------- GlassCard ---------- */
export function GlassCard({ className, children, hover = true, style, as: As = "div" }: { className?: string; children: ReactNode; hover?: boolean; style?: CSSProperties; as?: "div" | "section" | "article" }) {
  return (
    <As style={style} className={cn("glass rounded-[22px] p-5", hover && "lift", className)}>
      {children}
    </As>
  );
}

export function CardMenu({ label = t.common.moreActions }: { label?: string }) {
  return (
    <button type="button" aria-label={label} className="grid h-7 w-7 place-items-center rounded-full text-ink-500 hover:bg-olive-100">
      <MoreHorizontal className="h-4 w-4" />
    </button>
  );
}

/* ---------- Stagger wrapper ---------- */
export function Stagger({ children, className, start = 120, step = 60 }: { children: ReactNode[] | ReactNode; className?: string; start?: number; step?: number }) {
  const arr = Array.isArray(children) ? children : [children];
  return (
    <div className={className}>
      {arr.map((c, i) => (
        <div key={i} className="animate-rise min-w-0" style={{ animationDelay: `${start + i * step}ms` }}>
          {c}
        </div>
      ))}
    </div>
  );
}

/* ---------- PillButton ---------- */
const pill = cva(
  "relative inline-flex items-center justify-between gap-3 overflow-hidden rounded-full text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-olive-700 text-primary-foreground hover:bg-olive-800 shadow-soft",
        dark: "bg-olive-900 text-primary-foreground hover:bg-olive-800",
        secondary: "bg-surface-solid text-ink-900 border border-border-soft hover:bg-olive-100",
        ghost: "text-ink-900 hover:bg-olive-100",
      },
      size: { md: "h-11 pl-5 pr-1.5", lg: "h-14 pl-6 pr-2 text-[15px]", sm: "h-9 pl-4 pr-1 text-[13px]" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type PillProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof pill> & { icon?: ReactNode };
export function PillButton({ className, variant, size, icon, children, onClick, ...rest }: PillProps) {
  const ripple = useRipple();
  return (
    <button
      className={cn(pill({ variant, size }), !icon && "pr-5", className)}
      onClick={(e) => {
        ripple(e);
        onClick?.(e);
      }}
      {...rest}
    >
      <span className="truncate">{children}</span>
      {icon && (
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-full",
            size === "lg" ? "h-10 w-10" : size === "sm" ? "h-7 w-7" : "h-8 w-8",
            variant === "secondary" || variant === "ghost" ? "bg-olive-700 text-primary-foreground" : "bg-surface-solid text-olive-900",
          )}
        >
          {icon}
        </span>
      )}
    </button>
  );
}

export function IconButton({ label, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} className={cn("relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-solid text-ink-900 shadow-soft transition hover:bg-olive-100", className)} {...rest}>
      {children}
    </button>
  );
}

/* ---------- SegmentedChips ---------- */
export function SegmentedChips<T extends string>({ options, value, onChange, label, wrap = false }: { options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string; wrap?: boolean }) {
  return (
    <div role="tablist" aria-label={label} className={cn("glass inline-flex max-w-full gap-1 p-1 shadow-none [scrollbar-width:none]", wrap ? "flex-wrap rounded-[22px]" : "overflow-x-auto rounded-full")}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-8 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors",
              active ? "bg-olive-700 text-primary-foreground" : "bg-surface-solid/80 text-ink-900 hover:bg-olive-100",
            )}
          >
            {o.label}
            {o.count !== undefined && <span className="ml-1 opacity-70">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- StatusChip ---------- */
export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "strong";
const toneCls: Record<Tone, string> = {
  success: "bg-olive-200 text-olive-900",
  warning: "bg-warning/15 text-warning-ink",
  danger: "bg-danger/12 text-danger",
  info: "bg-info/12 text-info",
  neutral: "bg-surface-solid border border-border-soft text-ink-500",
  strong: "bg-olive-800 text-primary-foreground",
};
const toneIcon: Record<Tone, typeof CheckCircle2> = { success: CheckCircle2, warning: AlertTriangle, danger: XCircle, info: Info, neutral: Clock, strong: CheckCircle2 };

export function StatusChip({ tone = "neutral", children, dot = false }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  const Icon = toneIcon[tone];
  return (
    <span className={cn("inline-flex h-6 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium", toneCls[tone])}>
      {dot ? <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" /> : <Icon aria-hidden className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

export function DeltaChip({ value, label }: { value: string; label?: string | undefined }) {
  const down = value.trim().startsWith("-");
  const Icon = down ? ArrowDownRight : ArrowUpRight;
  return (
    <div className="flex min-w-0 items-center gap-2 text-[12px] text-ink-500">
      <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-olive-100 px-2 font-medium text-olive-900">
        <Icon aria-hidden className="h-3.5 w-3.5" />
        {value}
      </span>
      {label && <span className="truncate">{label}</span>}
    </div>
  );
}

/* ---------- PageHeader (two-tone) ---------- */
export function PageHeader({ title, muted, sub, actions }: { title: string; muted?: string | undefined; sub?: string | undefined; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 animate-rise">
        <h1 className="text-h1 text-ink-900">
          {title}
          {muted && <span className="text-ink-500"> {muted}</span>}.
        </h1>
        {sub && <p className="mt-1 truncate text-[13px] text-ink-500">{sub}</p>}
      </div>
      {actions && <div className="flex min-w-0 flex-wrap items-center gap-3 animate-rise" style={{ animationDelay: "80ms" }}>{actions}</div>}
    </header>
  );
}

/* ---------- Skeleton / Empty / Error ---------- */
export function Skel({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-[10px] bg-olive-100", className)} />;
}

export function EmptyState({ title = t.common.emptyTitle, body, icon, action, tone = "empty" }: { title?: string; body?: string; icon?: ReactNode; action?: ReactNode; tone?: "empty" | "error" }) {
  return (
    <div role={tone === "error" ? "alert" : undefined} className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className={cn("mb-4 grid h-14 w-14 place-items-center rounded-full", tone === "error" ? "bg-danger/12 text-danger" : "bg-olive-200 text-olive-900")}>
        {icon ?? (tone === "error" ? <AlertOctagon className="h-6 w-6" /> : <Inbox className="h-6 w-6" />)}
      </div>
      <h3 className="text-h3 text-ink-900">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-[14px] text-ink-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------- Timeline ---------- */
export function Timeline({ items }: { items: { title: string; meta: string; tone?: Tone }[] }) {
  return (
    <ol className="relative space-y-4 pl-6">
      <span aria-hidden className="absolute left-[7px] top-1 bottom-1 w-px bg-border-soft" />
      {items.map((it, i) => (
        <li key={i} className="relative min-w-0">
          <span aria-hidden className={cn("absolute -left-6 top-1 h-[15px] w-[15px] rounded-full border-[3px] border-surface-solid", i === 0 ? "bg-olive-700" : "bg-olive-200")} />
          <TruncatedText text={it.title} className="text-[14px] font-medium text-ink-900" />
          <p className="text-[12px] text-ink-500">{it.meta}</p>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Stepper ---------- */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex w-full items-center gap-2" aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex min-w-0 flex-1 items-center gap-2" aria-current={active ? "step" : undefined}>
            <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-medium", done ? "bg-olive-700 text-primary-foreground" : active ? "bg-olive-200 text-olive-900 ring-2 ring-olive-700" : "bg-surface-solid text-ink-500 border border-border-soft")}>
              {done ? "✓" : i + 1}
            </span>
            <span className={cn("hidden truncate text-[13px] sm:block", active ? "text-ink-900 font-medium" : "text-ink-500")}>{s}</span>
            {i < steps.length - 1 && <span aria-hidden className={cn("h-px flex-1", done ? "bg-olive-700" : "bg-border-soft")} />}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Success ring ---------- */
export function SuccessCheck() {
  return (
    <div className="grid h-36 w-36 place-items-center rounded-full bg-surface-solid/50">
      <div className="grid h-24 w-24 place-items-center rounded-full bg-surface-solid/80">
        <div className="grid h-16 w-16 animate-ring place-items-center rounded-full bg-olive-700 text-primary-foreground">
          <CheckCircle2 className="h-7 w-7" aria-hidden />
        </div>
      </div>
    </div>
  );
}
