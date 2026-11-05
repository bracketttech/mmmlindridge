import { Building2 } from "lucide-react";
import type { Property } from "@/services";
import { propertyImage } from "@/images";
import { useAppState } from "@/lib/app-state";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { StatusChip } from "../primitives";
import { FadeImage } from "../fade-image";

export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

/** Resolves stored photo refs ("bundled:p1" → shipped image, otherwise a URL / data URL). */
export const resolvePhoto = (src: string | undefined) => (src?.startsWith("bundled:") ? propertyImage(src.slice(8)) : src);
export const coverOf = (p: { photos: string[] }) => resolvePhoto(p.photos[0]);

/** Only the owner can create, edit or delete. Other roles see properties read-only. */
export function useCanManage() {
  return useAppState().role === "owner";
}

export type OccupancyStatus = "fully_let" | "vacancies" | "maintenance" | "setup";
export function occupancyStatuses(p: Pick<Property, "units" | "vacant" | "maintenance">): OccupancyStatus[] {
  if (p.units === 0) return ["setup"];
  const out: OccupancyStatus[] = [p.vacant > 0 ? "vacancies" : "fully_let"];
  if (p.maintenance > 0) out.push("maintenance");
  return out;
}

export function PropertyBadges({ p, onDark = false }: { p: Property; onDark?: boolean }) {
  const b = t.props.badge;
  return (
    <div className="flex flex-wrap gap-1.5">
      {occupancyStatuses(p).map((s) => {
        const chip =
          s === "setup" ? <StatusChip key={s} tone="neutral">{b.setup}</StatusChip>
          : s === "fully_let" ? <StatusChip key={s} tone="success">{b.fullyLet}</StatusChip>
          : s === "vacancies" ? <StatusChip key={s} tone="warning">{fill(b.vacant, { n: p.vacant })}</StatusChip>
          : <StatusChip key={s} tone="info">{fill(b.maintenance, { n: p.maintenance })}</StatusChip>;
        return onDark ? <span key={s} className="rounded-full bg-surface-solid/90">{chip}</span> : chip;
      })}
    </div>
  );
}

export function PropertyPhoto({ p, className, priority = false }: { p: { name: string; photos: string[] }; className?: string; priority?: boolean }) {
  const src = coverOf(p);
  return (
    <div className={cn("relative overflow-hidden bg-olive-200", className)}>
      {src ? (
        <FadeImage src={src} alt={p.name} width={1024} height={768} loading={priority ? "eager" : "lazy"} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-olive-700"><Building2 aria-hidden className="h-10 w-10" /></div>
      )}
    </div>
  );
}

/** Reads an image file and downsizes it to a JPEG data URL (keeps demo storage small). */
export function imageFileToDataUrl(file: File, max = 1280, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}
