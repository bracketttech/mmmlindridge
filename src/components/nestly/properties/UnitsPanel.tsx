import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { BedDouble, DoorOpen, LayoutGrid, List, MoreHorizontal, Pencil, Plus, Rows3, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { unitService, StorageFullError, type Property, type Unit, type UnitStatus } from "@/services";
import { UNIT_STATUSES } from "@/mocks/portfolio";
import { unitSchema, type UnitFormInput } from "@/lib/validation";
import { bulkUnitLabels, canDeleteUnit, MAX_BULK_UNITS } from "@/lib/portfolio-rules";
import { useData } from "@/lib/use-data";
import { formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { TextField } from "../auth";
import { SelectField, ToggleRow } from "../forms";
import { DataTable, Modal, StatusCell, type Column } from "../composites";
import { ConfirmDialog } from "../overlays";
import { EmptyState, GlassCard, PillButton, SegmentedChips, Skel, StatusChip, TruncatedText } from "../primitives";
import { statusTone } from "../composites";
import { fill } from "./shared";

const u = t.units;
type Filter = "all" | UnitStatus;

export function UnitsPanel({ property, canManage }: { property: Property; canManage: boolean }) {
  const { data, loading, error, reload } = useData(() => unitService.listByProperty(property.id), [property.id]);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const [editing, setEditing] = useState<Unit | "new" | null>(null);
  const [bulk, setBulk] = useState(false);
  const [toDelete, setToDelete] = useState<Unit | null>(null);
  const [blocked, setBlocked] = useState<Unit | null>(null);

  const units = data ?? [];
  const rows = useMemo(() => units.filter((x) => filter === "all" || x.status === filter).sort((a, b) => a.label.localeCompare(b.label, "en-ZA", { numeric: true })), [units, filter]);
  const count = (s: Filter) => (s === "all" ? units.length : units.filter((x) => x.status === s).length);
  const askDelete = (x: Unit) => (canDeleteUnit(x) ? setToDelete(x) : setBlocked(x));

  const menu = (x: Unit) => canManage && (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`${u.actions}: ${x.label}`} onClick={(e) => e.stopPropagation()} className="grid h-8 w-8 place-items-center rounded-full text-ink-500 hover:bg-olive-100"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-[14px] p-1.5">
        <DropdownMenuItem onSelect={() => setEditing(x)}><Pencil className="h-4 w-4" />{u.edit}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => askDelete(x)} className="text-danger focus:text-danger"><Trash2 className="h-4 w-4" />{u.delete}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const cols: Column<Unit>[] = [
    { key: "unit", header: u.cols.unit, render: (x) => <div className="min-w-0"><p className="font-medium text-ink-900">{x.label}</p><p className="text-[12px] text-ink-500">{fill(u.bedBath, { b: x.beds, ba: x.baths })}</p></div> },
    { key: "status", header: u.cols.status, render: (x) => <StatusCell status={x.status} /> },
    { key: "tenant", header: u.cols.tenant, render: (x) => x.tenantName ? <TruncatedText text={x.tenantName} className="max-w-[200px] text-ink-900" /> : <span className="text-ink-500">—</span> },
    { key: "size", header: u.cols.size, render: (x) => <span className="tabular-nums">{x.sizeM2} m²</span> },
    { key: "rent", header: u.cols.rent, render: (x) => <span className="tabular-nums text-ink-900">{formatZAR(x.rent)}</span> },
    { key: "deposit", header: u.cols.deposit, render: (x) => <span className="tabular-nums text-ink-500">{formatZAR(x.deposit)}</span> },
    { key: "menu", header: "", className: "w-10", render: (x) => menu(x) },
  ];

  const card = (x: Unit) => (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2"><p className="text-[16px] font-medium text-ink-900">{x.label}</p><StatusCell status={x.status} /></div>
        <p className="text-[13px] text-ink-500">{fill(u.bedBath, { b: x.beds, ba: x.baths })} · {x.sizeM2} m²</p>
        <TruncatedText text={x.tenantName ?? u.vacantLabel} className="text-[13px] text-ink-900" />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {menu(x)}
        <p className="text-[15px] tabular-nums text-ink-900">{formatZAR(x.rent)}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedChips label={u.filter} value={filter} onChange={setFilter}
          options={(["all", ...UNIT_STATUSES] as Filter[]).map((s) => ({ value: s, label: u.statuses[s], count: loading ? undefined : count(s) }))} />
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label={`${u.list} / ${u.grid}`} className="glass hidden gap-1 rounded-full p-1 shadow-none md:inline-flex">
            {(["list", "grid"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} aria-label={v === "list" ? u.list : u.grid} onClick={() => setView(v)}
                className={cn("grid h-8 w-8 place-items-center rounded-full transition-colors", view === v ? "bg-olive-700 text-primary-foreground" : "text-ink-900 hover:bg-olive-100")}>
                {v === "list" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </button>
            ))}
          </div>
          {canManage && <PillButton size="sm" variant="secondary" icon={<Rows3 className="h-3.5 w-3.5" />} onClick={() => setBulk(true)}>{u.bulk}</PillButton>}
          {canManage && <PillButton size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setEditing("new")}>{u.add}</PillButton>}
        </div>
      </div>

      {!loading && !error && units.length === 0 ? (
        <GlassCard hover={false}>
          <EmptyState icon={<DoorOpen className="h-6 w-6" />} title={u.emptyTitle} body={u.emptyBody}
            action={canManage && <div className="flex flex-wrap justify-center gap-2"><PillButton variant="secondary" icon={<Rows3 className="h-4 w-4" />} onClick={() => setBulk(true)}>{u.bulk}</PillButton><PillButton icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>{u.add}</PillButton></div>} />
        </GlassCard>
      ) : view === "grid" ? (
        <div className="hidden md:block">
          {loading ? <div className="grid grid-cols-3 gap-3 xl:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <Skel key={i} className="h-32 rounded-[18px]" />)}</div>
            : rows.length === 0 ? <GlassCard hover={false}><EmptyState title={u.noMatch} /></GlassCard>
            : (
              <ul className="grid grid-cols-3 gap-3 xl:grid-cols-5">
                {rows.map((x) => (
                  <li key={x.id} className="glass lift relative flex min-h-32 flex-col justify-between rounded-[18px] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><p className="truncate text-[18px] text-ink-900">{x.label}</p><p className="flex items-center gap-1 text-[12px] text-ink-500"><BedDouble aria-hidden className="h-3.5 w-3.5" />{fill(u.bedBath, { b: x.beds, ba: x.baths })}</p></div>
                      {menu(x)}
                    </div>
                    <div className="space-y-1.5">
                      <StatusChip tone={statusTone(x.status)} dot>{u.statuses[x.status]}</StatusChip>
                      <TruncatedText text={x.tenantName ?? formatZAR(x.rent)} className="text-[13px] text-ink-900" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </div>
      ) : null}

      {(view === "list" || true) && units.length + (loading ? 1 : 0) > 0 && (
        <GlassCard hover={false} className={cn("p-2 md:p-4", view === "grid" && "md:hidden")}>
          <DataTable caption={`${u.cols.unit} — ${property.name}`} rows={rows} columns={cols} loading={loading} error={error} onRetry={reload} card={card}
            empty={<EmptyState title={u.noMatch} />} />
        </GlassCard>
      )}

      {editing && <UnitFormModal key={editing === "new" ? "new" : editing.id} propertyId={property.id} unit={editing === "new" ? null : editing} existing={units} onClose={() => setEditing(null)} />}
      {bulk && <BulkUnitsModal propertyId={property.id} existing={units} onClose={() => setBulk(false)} />}
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={fill(u.deleteTitle, { label: toDelete?.label ?? "" })} body={u.deleteBody}
        onConfirm={async () => { if (!toDelete) return; await unitService.remove(toDelete.id); toast.success(u.deleted); }} />
      <Modal open={!!blocked} onOpenChange={(o) => !o && setBlocked(null)} title={fill(u.deleteTitle, { label: blocked?.label ?? "" })}
        footer={<PillButton onClick={() => setBlocked(null)}>{t.common.close}</PillButton>}>
        <p className="text-[14px] text-ink-500">{fill(u.blocked, { label: blocked?.label ?? "" })}</p>
      </Modal>
    </div>
  );
}

function UnitFormModal({ propertyId, unit, existing, onClose }: { propertyId: string; unit: Unit | null; existing: Unit[]; onClose: () => void }) {
  const f = u.form;
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<UnitFormInput>({
    resolver: zodResolver(unitSchema),
    defaultValues: unit
      ? { label: unit.label, beds: unit.beds, baths: unit.baths, sizeM2: unit.sizeM2, rent: unit.rent, deposit: unit.deposit, status: unit.status, features: unit.features.join(", ") }
      : { label: "", beds: 1, baths: 1, sizeM2: 50, rent: 8500, deposit: 8500, status: "vacant", features: "" },
  });
  const submit = handleSubmit(async (v) => {
    const clash = existing.some((x) => x.id !== unit?.id && x.label.trim().toLowerCase() === v.label.trim().toLowerCase());
    if (clash) return setError("label", { message: f.duplicate });
    if (unit?.tenantId && (v.status === "vacant" || v.status === "maintenance")) return setError("status", { message: f.tenantStatus });
    const input = { label: v.label.trim(), beds: v.beds, baths: v.baths, sizeM2: v.sizeM2, rent: v.rent, deposit: v.deposit, status: v.status as UnitStatus, features: v.features.split(",").map((s) => s.trim()).filter(Boolean) };
    try {
      if (unit) { await unitService.update(unit.id, input); toast.success(u.updated); }
      else { await unitService.create(propertyId, input); toast.success(u.created); }
      onClose();
    } catch (e) { toast.error(e instanceof StorageFullError ? t.props.form.storageFull : t.common.errorBody); }
  });
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={unit ? fill(f.editTitle, { label: unit.label }) : f.addTitle} wide
      footer={<><PillButton variant="secondary" onClick={onClose}>{t.common.cancel}</PillButton><PillButton type="submit" form="unit-form" disabled={isSubmitting}>{isSubmitting ? t.common.working : f.save}</PillButton></>}>
      <form id="unit-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <TextField label={f.label} placeholder={f.labelPh} autoFocus error={errors.label?.message} {...register("label")} />
        <SelectField label={f.status} error={errors.status?.message} {...register("status")}>
          {UNIT_STATUSES.map((s) => <option key={s} value={s}>{u.statuses[s]}</option>)}
        </SelectField>
        <TextField label={f.beds} type="number" inputMode="numeric" min={0} error={errors.beds?.message} {...register("beds")} />
        <TextField label={f.baths} type="number" inputMode="numeric" min={0} error={errors.baths?.message} {...register("baths")} />
        <TextField label={f.size} type="number" inputMode="numeric" min={0} error={errors.sizeM2?.message} {...register("sizeM2")} />
        <TextField label={f.rent} type="number" inputMode="numeric" min={0} error={errors.rent?.message} {...register("rent")} />
        <TextField label={f.deposit} type="number" inputMode="numeric" min={0} error={errors.deposit?.message} {...register("deposit")} />
        <TextField label={f.features} placeholder={f.featuresPh} error={errors.features?.message} {...register("features")} />
      </form>
    </Modal>
  );
}

function BulkUnitsModal({ propertyId, existing, onClose }: { propertyId: string; existing: Unit[]; onClose: () => void }) {
  const b = u.bulkForm;
  const [prefix, setPrefix] = useState("C");
  const [start, setStart] = useState(301);
  const [count, setCount] = useState(6);
  const [pad, setPad] = useState(false);
  const [beds, setBeds] = useState(2);
  const [rent, setRent] = useState(12500);
  const [busy, setBusy] = useState(false);
  const safeCount = Math.max(0, Math.min(MAX_BULK_UNITS, Math.floor(count || 0)));
  const { labels, clashes } = bulkUnitLabels({ prefix, start: Math.max(0, Math.floor(start || 0)), count: safeCount, pad: pad ? 2 : 0 }, existing.map((x) => x.label));
  const invalid = safeCount < 1 || count > MAX_BULK_UNITS || rent < 500 || labels.length === 0;

  const create = async () => {
    setBusy(true);
    try {
      await unitService.bulkCreate(propertyId, labels, { beds, baths: beds > 2 ? 2 : 1, sizeM2: 40 + beds * 25, rent, deposit: rent, status: "vacant", features: [] });
      toast.success(fill(u.bulkCreated, { n: labels.length }));
      onClose();
    } catch (e) { toast.error(e instanceof StorageFullError ? t.props.form.storageFull : t.common.errorBody); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onOpenChange={(o) => !o && !busy && onClose()} title={b.title} wide
      footer={<><PillButton variant="secondary" onClick={onClose} disabled={busy}>{t.common.cancel}</PillButton><PillButton onClick={create} disabled={invalid || busy}>{busy ? t.common.working : fill(b.create, { n: labels.length })}</PillButton></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label={b.prefix} placeholder={b.prefixPh} value={prefix} maxLength={12} onChange={(e) => setPrefix(e.target.value)} />
          <TextField label={b.start} type="number" inputMode="numeric" min={0} value={start} onChange={(e) => setStart(Number(e.target.value))} />
          <TextField label={b.count} type="number" inputMode="numeric" min={1} max={MAX_BULK_UNITS} value={count} onChange={(e) => setCount(Number(e.target.value))}
            error={count > MAX_BULK_UNITS ? fill(b.max, { n: MAX_BULK_UNITS }) : undefined} />
          <TextField label={u.form.beds} type="number" inputMode="numeric" min={0} value={beds} onChange={(e) => setBeds(Number(e.target.value))} />
          <div className="sm:col-span-2"><TextField label={u.form.rent} type="number" inputMode="numeric" min={500} value={rent} onChange={(e) => setRent(Number(e.target.value))} error={rent < 500 ? u.form.rentRange : undefined} /></div>
        </div>
        <ToggleRow label={b.pad} checked={pad} onChange={setPad} />
        <div className="rounded-[18px] border border-border-soft bg-olive-100/50 p-4" aria-live="polite">
          <p className="text-overline text-ink-500">{b.preview}</p>
          <p className="mt-1 text-[14px] font-medium text-ink-900">{fill(b.willCreate, { n: labels.length })}</p>
          <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
            {labels.slice(0, 40).map((l) => <span key={l} className="rounded-full bg-surface-solid px-2.5 py-0.5 text-[12px] text-ink-900">{l}</span>)}
            {labels.length > 40 && <span className="px-1 text-[12px] text-ink-500">+{labels.length - 40}</span>}
          </div>
          {clashes.length > 0 && <p className="mt-2 text-[12px] text-warning-ink">{fill(b.skipped, { list: clashes.slice(0, 8).join(", ") + (clashes.length > 8 ? "…" : "") })}</p>}
        </div>
      </div>
    </Modal>
  );
}
