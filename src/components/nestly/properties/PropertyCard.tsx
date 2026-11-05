import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Property } from "@/services";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCompactZAR, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { TruncatedText } from "../primitives";
import { PropertyBadges, PropertyPhoto, fill } from "./shared";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function PropertyCard({ p, canManage, onDelete }: { p: Property; canManage: boolean; onDelete: (p: Property) => void }) {
  const c = t.props.card;
  const occ = p.units ? Math.round((p.occupied / p.units) * 100) : 0;
  return (
    <article className="glass lift group relative flex h-full flex-col rounded-[22px] p-2">
      <div className="relative">
        <PropertyPhoto p={p} className="h-48 rounded-[18px] sm:h-52" />
        <div className="absolute left-3 top-3 right-14"><PropertyBadges p={p} onDark /></div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger aria-label={`${t.props.detail.actions}: ${p.name}`} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-surface-solid/90 text-ink-900 shadow-soft hover:bg-surface-solid">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-[14px] p-1.5">
              <DropdownMenuItem asChild><Link to="/properties/$propertyId/edit" params={{ propertyId: p.id }}><Pencil className="h-4 w-4" />{t.props.detail.edit}</Link></DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDelete(p)} className="text-danger focus:text-danger"><Trash2 className="h-4 w-4" />{t.common.delete}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 px-3 pb-3 pt-4">
        <div className="min-w-0">
          <h3 className="min-w-0">
            {/* Stretched link: the whole card opens the property, the menu stays clickable above it. */}
            <Link to="/properties/$propertyId" params={{ propertyId: p.id }} aria-label={fill(c.open, { name: p.name })} className="rounded-sm after:absolute after:inset-0 after:rounded-[22px] after:content-['']">
              <TruncatedText text={p.name} className="text-h3 text-ink-900" />
            </Link>
          </h3>
          <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[13px] text-ink-500">
            <MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" />
            <TruncatedText text={`${p.address}, ${p.suburb}, ${p.city}`} />
          </p>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border-soft pt-3">
          <dl className="grid min-w-0 flex-1 grid-cols-3 gap-2 text-[12px] text-ink-500">
            <div className="min-w-0"><dt className="truncate">{t.props.detail.units}</dt><dd className="text-[16px] tabular-nums text-ink-900">{p.units}</dd></div>
            <div className="min-w-0"><dt className="truncate">{c.occupied}</dt><dd className="text-[16px] tabular-nums text-ink-900">{occ}%</dd></div>
            <div className="min-w-0">
              <dt className="truncate">{c.rentRoll}</dt>
              <Tooltip>
                <TooltipTrigger asChild><dd tabIndex={0} className="relative z-10 w-fit rounded-sm text-[16px] tabular-nums text-ink-900">{formatCompactZAR(p.rentRoll)}</dd></TooltipTrigger>
                <TooltipContent>{formatZAR(p.rentRoll)} {t.props.kpi.perMonth}</TooltipContent>
              </Tooltip>
            </div>
          </dl>
          <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-olive-700 text-primary-foreground transition-transform group-hover:rotate-45"><ArrowUpRight className="h-4 w-4" /></span>
        </div>
      </div>
    </article>
  );
}
