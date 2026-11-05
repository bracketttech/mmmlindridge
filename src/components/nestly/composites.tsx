import { useRef, useState, type ReactNode } from "react";
import { X, Camera, Trash2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Drawer } from "vaul";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { t } from "@/lib/strings";
import { CardMenu, DeltaChip, GlassCard, Skel, StatusChip, TruncatedText, EmptyState, PillButton, type Tone } from "./primitives";
import { MiniDonut, MiniSpark, MiniTicks } from "./charts";
import { FadeImage } from "./fade-image";

/* ---------- KpiTile ---------- */
type KpiProps = {
  label: string; value: string; unit?: string; delta?: string; deltaLabel?: string;
  variant?: "donut" | "sparkline" | "tick-bar" | "plain"; visual?: number[]; percent?: number; tip?: string; loading?: boolean;
};
export function KpiTile({ label, value, unit, delta, deltaLabel, variant = "plain", visual = [], percent = 0, tip = "", loading }: KpiProps) {
  if (loading)
    return (
      <GlassCard hover={false} className="space-y-4">
        <Skel className="h-3 w-24" /><Skel className="h-10 w-32" /><Skel className="h-5 w-28" />
      </GlassCard>
    );
  return (
    <GlassCard className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <TruncatedText text={label} className="text-[13px] text-ink-500" />
        <CardMenu />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="text-kpi whitespace-nowrap text-ink-900">{value}</span>
          {unit && <span className="truncate text-[13px] text-ink-500">{unit}</span>}
        </div>
        {variant === "donut" && <MiniDonut value={percent} tip={tip} />}
        {variant === "sparkline" && <MiniSpark points={visual} tip={tip} />}
        {variant === "tick-bar" && <MiniTicks values={visual} tip={tip} />}
      </div>
      {delta && <DeltaChip value={delta} label={deltaLabel} />}
    </GlassCard>
  );
}

/* ---------- Avatar ---------- */
export function NAvatar({ name, src, size = 36, className }: { name: string; src?: string | null | undefined; size?: number; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImg = !!src && failedSrc !== src;
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-olive-200 font-medium text-olive-900", className)} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {showImg
        ? <FadeImage src={src} alt={name} width={size} height={size} onError={() => setFailedSrc(src)} className="absolute inset-0 h-full w-full object-cover" />
        : <span aria-label={name}>{initials(name)}</span>}
    </span>
  );
}

/* ---------- DataTable ---------- */
export type Column<T> = { key: string; header: string; className?: string; render: (row: T) => ReactNode };
export function DataTable<T extends { id: string }>({ rows, columns, selectedId, onSelect, loading, error, onRetry, caption, card, empty }: { rows: T[]; columns: Column<T>[]; selectedId?: string | undefined; onSelect?: (id: string) => void; loading?: boolean; error?: boolean; onRetry?: () => void; caption: string; card?: (row: T) => ReactNode; empty?: ReactNode }) {
  const emptyNode = empty ?? <EmptyState body="No rows match this filter." />;
  return (
    <>
    {card && (
      <ul aria-label={caption} className="space-y-2 md:hidden">
        {loading && Array.from({ length: 3 }).map((_, i) => <li key={i}><Skel className="h-24 w-full rounded-[18px]" /></li>)}
        {!loading && error && <li><EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={onRetry && <PillButton variant="secondary" onClick={onRetry}>{t.common.retry}</PillButton>} /></li>}
        {!loading && !error && rows.length === 0 && <li>{emptyNode}</li>}
        {!loading && !error && rows.map((r) => (
          <li key={r.id} className={cn("rounded-[18px] border border-border-soft bg-surface-solid/80 p-4", r.id === selectedId && "bg-olive-100")}>{card(r)}</li>
        ))}
      </ul>
    )}
    <div className={cn("w-full overflow-x-auto", card && "hidden md:block")}>
      <table className="w-full min-w-[640px] border-separate border-spacing-y-1 text-left text-[14px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-surface-solid/70">
            {columns.map((c, i) => (
              <th key={c.key} scope="col" className={cn("text-overline whitespace-nowrap px-3 py-3 font-medium text-ink-500", i === 0 && "rounded-l-[10px]", i === columns.length - 1 && "rounded-r-[10px]", c.className)}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}><td colSpan={columns.length} className="px-3 py-2"><Skel className="h-10 w-full" /></td></tr>
            ))}
          {!loading && error && (
            <tr><td colSpan={columns.length}><EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={onRetry && <PillButton variant="secondary" onClick={onRetry}>{t.common.retry}</PillButton>} /></td></tr>
          )}
          {!loading && !error && rows.length === 0 && (
            <tr><td colSpan={columns.length}>{emptyNode}</td></tr>
          )}
          {!loading && !error && rows.map((r) => {
            const sel = r.id === selectedId;
            return (
              <tr
                key={r.id}
                tabIndex={onSelect ? 0 : undefined}
                aria-selected={sel}
                onClick={() => onSelect?.(r.id)}
                onKeyDown={(e) => e.key === "Enter" && onSelect?.(r.id)}
                className={cn("cursor-pointer transition-colors", sel ? "bg-olive-100" : "hover:bg-surface-solid/70")}
              >
                {columns.map((c, i) => (
                  <td key={c.key} className={cn("whitespace-nowrap border-b border-border-soft px-3 py-3 align-middle", sel && "border-transparent", i === 0 && "rounded-l-[12px]", i === columns.length - 1 && "rounded-r-[12px]", c.className)}>{c.render(r)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}

export function PersonCell({ name, email, src }: { name: string; email: string; src?: string | undefined }) {
  return (
    <div className="flex min-w-0 max-w-[260px] items-center gap-3">
      <NAvatar name={name} src={src} />
      <div className="min-w-0">
        <TruncatedText text={name} className="font-medium text-ink-900" />
        <TruncatedText text={email} className="text-[12px] text-ink-500" />
      </div>
    </div>
  );
}

export function ProgressCell({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3" aria-label={`${value}%`}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-olive-100">
        <div className="h-full rounded-full bg-olive-800" style={{ width: `${value}%` }} />
      </div>
      <span className="text-[12px] tabular-nums text-ink-500">{value}%</span>
    </div>
  );
}

export const statusTone = (s: string): Tone =>
  (({ active: "success", paid: "success", resolved: "success", occupied: "success", pending: "neutral", open: "info", in_progress: "warning", notice: "warning", overdue: "danger", arrears: "danger", failed: "danger", vacant: "neutral" }) as Record<string, Tone>)[s] ?? "neutral";
export const StatusCell = ({ status }: { status: string }) => <StatusChip tone={statusTone(status)} dot>{status.replace("_", " ").replace(/^./, (c) => c.toUpperCase())}</StatusChip>;

/* ---------- Modal ---------- */
export function Modal({ open, onOpenChange, title, children, footer, wide = false }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-olive-900/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className={cn("fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] bg-surface-solid p-6 shadow-soft", wide ? "max-w-xl" : "max-w-md", " data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95")}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <Dialog.Title className="truncate text-h2 text-ink-900">{title}</Dialog.Title>
            <Dialog.Close aria-label={t.shell.close} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-olive-100"><X className="h-4 w-4" /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
          {children}
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ---------- BottomSheet ---------- */
export function BottomSheet({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode }) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-olive-900/30 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-[28px] bg-surface-solid p-5 pb-8 outline-none">
          <div aria-hidden className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-olive-200" />
          <Drawer.Title className="mb-3 text-h2 text-ink-900">{title}</Drawer.Title>
          <Drawer.Description className="sr-only">{title}</Drawer.Description>
          <div className="overflow-y-auto">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/* ---------- AvatarUploader (mock: pick → crop/preview → save → delete) ---------- */
export function AvatarUploader({ name, initial = null, onChange }: { name: string; initial?: string | null; onChange?: (src: string | null) => void }) {
  const [saved, setSaved] = useState<string | null>(initial);
  const [draft, setDraft] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const input = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const pick = (f?: File): void => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    const reader = new FileReader();
    reader.onload = () => { setDraft(String(reader.result)); setZoom(1); };
    reader.readAsDataURL(f);
  };

  const save = () => {
    const img = imgRef.current;
    if (!img) return;
    const size = 256, canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const side = Math.min(img.naturalWidth, img.naturalHeight) / zoom;
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    const out = canvas.toDataURL("image/jpeg", 0.9);
    setSaved(out); onChange?.(out); setDraft(null);
    if (input.current) input.current.value = "";
    toast.success("Profile photo saved");
  };

  const remove = () => { setSaved(null); onChange?.(null); toast("Photo removed — showing initials"); };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <NAvatar name={name} src={saved} size={72} className="ring-4 ring-surface-solid" />
      <div className="flex flex-wrap gap-2">
        <PillButton size="sm" icon={<Camera className="h-3.5 w-3.5" />} onClick={() => input.current?.click()}>{saved ? t.common.change : t.common.upload}</PillButton>
        {saved && <PillButton size="sm" variant="secondary" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={remove}>{t.common.remove}</PillButton>}
      </div>
      <input ref={input} type="file" accept="image/*" className="sr-only" aria-label={t.common.upload} onChange={(e) => pick(e.target.files?.[0])} />
      <Modal open={!!draft} onOpenChange={(o) => !o && setDraft(null)} title={t.common.cropTitle}
        footer={<><PillButton variant="secondary" onClick={() => setDraft(null)}>{t.common.cancel}</PillButton><PillButton onClick={save}>{t.common.save}</PillButton></>}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-56 w-56 overflow-hidden rounded-full bg-olive-100 ring-4 ring-olive-200">
            {draft && <img ref={imgRef} src={draft} alt="Preview" className="h-full w-full object-cover transition-transform" style={{ transform: `scale(${zoom})` }} />}
          </div>
          <label className="flex w-full items-center gap-3 text-[13px] text-ink-500">
            {t.common.zoom}
            <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-olive-700" />
          </label>
        </div>
      </Modal>
    </div>
  );
}
