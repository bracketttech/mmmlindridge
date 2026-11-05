import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Building2, ChevronLeft, ChevronRight, MapPin, Pencil, Trash2, UserPlus, Users, Wrench } from "lucide-react";
import { Placeholder } from "@/components/nestly/Placeholder";
import { EmptyState, GlassCard, PageHeader, PillButton, Skel, StatusChip, TruncatedText } from "@/components/nestly/primitives";
import { DataTable, KpiTile, Modal, NAvatar, PersonCell, StatusCell, type Column } from "@/components/nestly/composites";
import { ChartCard, TickBarChart } from "@/components/nestly/charts";
import { ChipMultiSelect } from "@/components/nestly/forms";
import { FadeImage } from "@/components/nestly/fade-image";
import { UnitsPanel } from "@/components/nestly/properties/UnitsPanel";
import { DocumentsPanel } from "@/components/nestly/properties/DocumentsPanel";
import { usePropertyDelete } from "@/components/nestly/properties/actions";
import { fill, PropertyBadges, resolvePhoto, useCanManage } from "@/components/nestly/properties/shared";
import { invoiceService, propertyService, requestService, staffService, tenantService, type Invoice, type Property, type Request, type Staff, type Tenant } from "@/services";
import { useAppState } from "@/lib/app-state";
import { roleCanSee } from "@/lib/nav";
import { useData } from "@/lib/use-data";
import { formatDate, formatZAR } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

const TABS = ["overview", "units", "tenants", "documents", "maintenance", "finance", "staff"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/_shell/properties/$propertyId")({
  head: () => pageHead("Property", "Property overview, units, tenants, documents, maintenance, finance and staff."),
  validateSearch: (s: Record<string, unknown>): { tab: Tab } => ({ tab: TABS.includes(s["tab"] as Tab) ? (s["tab"] as Tab) : "overview" }),
  component: PropertyDetailPage,
});

function PropertyDetailPage() {
  const { propertyId } = Route.useParams();
  const { tab } = Route.useSearch();
  const { role } = useAppState();
  const canManage = useCanManage();
  const navigate = useNavigate();
  const d = t.props.detail;
  const { data: p, loading, error, reload } = useData(() => propertyService.get(propertyId), [propertyId]);
  const del = usePropertyDelete(() => navigate({ to: "/properties", replace: true }));

  if (!roleCanSee(role, "properties")) return <Placeholder navKey="properties" title={t.props.title} muted={t.props.muted} />;
  if (loading) return <div className="space-y-6"><Skel className="h-12 w-72" /><Skel className="h-11 w-full rounded-full" /><Skel className="h-80 rounded-[22px]" /></div>;
  if (error) return <GlassCard hover={false}><EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={reload}>{t.common.retry}</PillButton>} /></GlassCard>;
  if (!p) return <GlassCard hover={false}><EmptyState icon={<Building2 className="h-6 w-6" />} title={t.props.notFound} body={t.props.notFoundBody} action={<Link to="/properties" className="text-[14px] font-medium text-olive-700 underline">{t.props.back}</Link>} /></GlassCard>;

  const actions = canManage && (
    <div className="flex gap-2">
      <PillButton variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => navigate({ to: "/properties/$propertyId/edit", params: { propertyId: p.id } })}>{d.edit}</PillButton>
      <PillButton variant="secondary" icon={<Trash2 className="h-4 w-4" />} onClick={() => del.ask(p)} aria-label={d.delete}><span className="hidden sm:inline">{t.common.delete}</span></PillButton>
    </div>
  );

  return (
    <div className="space-y-6">
      <Link to="/properties" className="inline-flex items-center gap-1.5 rounded-full text-[13px] font-medium text-olive-700 hover:underline"><ArrowLeft aria-hidden className="h-4 w-4" />{t.props.back}</Link>
      <PageHeader title={p.name} sub={`${p.address}, ${p.suburb}, ${p.city}`} actions={actions} />
      <nav aria-label={d.sections} className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="glass inline-flex gap-1 rounded-full p-1 shadow-none">
          {TABS.map((k) => (
            <Link key={k} to="/properties/$propertyId" params={{ propertyId: p.id }} search={{ tab: k }} aria-current={tab === k ? "page" : undefined}
              className={cn("whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium transition-colors", tab === k ? "bg-ink-900 text-surface-solid" : "text-ink-700 hover:bg-olive-100")}>
              {d.tabs[k]}
            </Link>
          ))}
        </div>
      </nav>
      <div key={tab} className="animate-rise">
        {tab === "overview" && <Overview p={p} />}
        {tab === "units" && <UnitsPanel property={p} canManage={canManage} />}
        {tab === "tenants" && <TenantsTab p={p} />}
        {tab === "documents" && <DocumentsPanel property={p} canManage={canManage} />}
        {tab === "maintenance" && <MaintenanceTab p={p} />}
        {tab === "finance" && <FinanceTab p={p} />}
        {tab === "staff" && <StaffTab p={p} canManage={canManage} />}
      </div>
      {del.dialog}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-medium text-ink-900"><TruncatedText text={value || "—"} /></dd>
    </div>
  );
}

function Gallery({ p }: { p: Property }) {
  const d = t.props.detail;
  const [i, setI] = useState(0);
  const n = p.photos.length;
  if (!n) return <div className="grid aspect-[16/9] place-items-center rounded-[18px] bg-olive-200 text-olive-700"><Building2 aria-hidden className="h-10 w-10" /></div>;
  const src = resolvePhoto(p.photos[i]);
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-[18px] bg-olive-200">
      {src && <FadeImage key={i} src={src} alt={fill(d.gallery, { i: i + 1, n })} width={1280} height={720} loading="eager" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute left-3 top-3"><PropertyBadges p={p} onDark /></div>
      {n > 1 && (
        <>
          <button type="button" aria-label={d.prev} onClick={() => setI((i - 1 + n) % n)} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-surface-solid/90 text-ink-900 shadow-soft"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" aria-label={d.next} onClick={() => setI((i + 1) % n)} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-surface-solid/90 text-ink-900 shadow-soft"><ChevronRight className="h-5 w-5" /></button>
          <span className="absolute bottom-3 right-3 rounded-full bg-surface-solid/90 px-3 py-1 text-[12px] font-medium text-ink-900">{`${i + 1} / ${n}`}</span>
        </>
      )}
    </div>
  );
}

function Overview({ p }: { p: Property }) {
  const d = t.props.detail;
  const occ = p.units ? Math.round((p.occupied / p.units) * 100) : 0;
  const mix = [
    { label: t.units.statuses.occupied, value: p.occupied - p.notice },
    { label: t.units.statuses.notice, value: p.notice },
    { label: t.units.statuses.vacant, value: p.vacant },
    { label: t.units.statuses.maintenance, value: p.maintenance },
  ];
  const m = p.municipal;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <GlassCard hover={false} className="p-2"><Gallery p={p} /></GlassCard>
        {p.description && <GlassCard hover={false} className="p-5"><p className="text-[14px] leading-relaxed text-ink-700">{p.description}</p></GlassCard>}
        <GlassCard hover={false} className="space-y-3 p-5">
          <h2 className="text-h3 text-ink-900">{d.amenities}</h2>
          {p.amenities.length ? (
            <div className="flex flex-wrap gap-2">{p.amenities.map((a) => <StatusChip key={a} tone="neutral">{t.props.amenities[a]}</StatusChip>)}</div>
          ) : <p className="text-[13px] text-ink-500">{d.noAmenities}</p>}
        </GlassCard>
        <div className="grid gap-4 md:grid-cols-2">
          <GlassCard hover={false} className="space-y-3 p-5">
            <h2 className="text-h3 text-ink-900">{d.municipal}</h2>
            <dl className="grid grid-cols-2 gap-3">
              <Fact label={d.municipality} value={m.municipality} />
              <Fact label={d.account} value={m.accountNo} />
              <Fact label={d.rates} value={m.ratesMonthly ? formatZAR(m.ratesMonthly) : ""} />
              <Fact label={d.electricity} value={m.electricity === "prepaid" ? t.props.form.prepaid : t.props.form.conventional} />
              <Fact label={d.elecMeter} value={m.electricityMeter} />
              <Fact label={d.waterMeter} value={m.waterMeter} />
            </dl>
          </GlassCard>
          <GlassCard hover={false} className="space-y-3 p-5">
            <h2 className="text-h3 text-ink-900">{d.rules}</h2>
            <dl className="grid grid-cols-2 gap-3">
              <Fact label={d.pets} value={p.rules.pets ? d.allowed : d.notAllowed} />
              <Fact label={d.smoking} value={p.rules.smoking ? d.allowed : d.notAllowed} />
              <Fact label={d.quiet} value={`${p.rules.quietFrom} – ${p.rules.quietTo}`} />
            </dl>
            <p className="whitespace-pre-line break-words text-[13px] text-ink-700">{p.rules.text || d.noRules}</p>
          </GlassCard>
        </div>
      </div>
      <div className="space-y-4">
        <GlassCard hover={false} className="space-y-3 p-5">
          <h2 className="text-h3 text-ink-900">{d.facts}</h2>
          <dl className="grid grid-cols-2 gap-3">
            <Fact label={d.type} value={t.props.types[p.type]} />
            <Fact label={d.built} value={p.yearBuilt} />
            <Fact label={d.units} value={String(p.units)} />
            <Fact label={d.occupancy} value={`${occ}%`} />
            <Fact label={d.rentRoll} value={formatZAR(p.rentRoll)} />
            <Fact label={d.erf} value={p.erf} />
          </dl>
          <p className="flex min-w-0 items-center gap-1 border-t border-border-soft pt-3 text-[13px] text-ink-500"><MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" /><TruncatedText text={`${p.address}, ${p.suburb}, ${p.city}, ${p.province}, ${p.postalCode}`} /></p>
        </GlassCard>
        <ChartCard title={d.unitMix} state={p.units ? "ready" : "empty"}>
          <TickBarChart data={mix} />
        </ChartCard>
      </div>
    </div>
  );
}

function TenantsTab({ p }: { p: Property }) {
  const d = t.props.detail;
  const { data, loading, error, reload } = useData(() => tenantService.list(p.id), [p.id]);
  const cols: Column<Tenant>[] = [
    { key: "name", header: t.units.cols.tenant, render: (x) => <PersonCell name={x.name} email={x.email} src={x.avatar} /> },
    { key: "status", header: t.units.cols.status, render: (x) => <StatusCell status={x.status} /> },
    { key: "rent", header: t.units.cols.rent, render: (x) => <span className="tabular-nums">{formatZAR(x.rent)}</span> },
    { key: "paid", header: d.collected, render: (x) => <span className="tabular-nums text-ink-500">{formatDate(x.lastPayment)}</span> },
  ];
  return (
    <GlassCard hover={false} className="p-3 md:p-4">
      <h2 className="mb-3 px-1 text-h3 text-ink-900">{d.tenantsTitle}</h2>
      <DataTable rows={data ?? []} columns={cols} loading={loading} error={error} onRetry={reload} caption={d.tenantsTitle}
        card={(x) => <div className="flex items-center justify-between gap-3"><PersonCell name={x.name} email={x.email} src={x.avatar} /><div className="text-right"><StatusCell status={x.status} /><p className="mt-1 text-[13px] tabular-nums">{formatZAR(x.rent)}</p></div></div>}
        empty={<EmptyState icon={<Users className="h-6 w-6" />} title={d.tenantsEmpty} body={d.tenantsEmptyBody} />} />
    </GlassCard>
  );
}

function MaintenanceTab({ p }: { p: Property }) {
  const d = t.props.detail;
  const { data, loading, error, reload } = useData(() => requestService.list(p.id), [p.id]);
  const cols: Column<Request>[] = [
    { key: "title", header: d.maintTitle, render: (x) => <TruncatedText text={x.title} className="max-w-[280px] font-medium text-ink-900" /> },
    { key: "type", header: d.type, render: (x) => <StatusChip tone={x.type === "fault" ? "warning" : "info"}>{x.type === "fault" ? "Fault" : "Upgrade"}</StatusChip> },
    { key: "priority", header: "Priority", render: (x) => <StatusCell status={x.priority} /> },
    { key: "status", header: t.units.cols.status, render: (x) => <StatusCell status={x.status} /> },
    { key: "date", header: "Logged", render: (x) => <span className="text-ink-500">{formatDate(x.createdAt)}</span> },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:max-w-md">
        <KpiTile loading={loading} label={d.maintTitle} value={String((data ?? []).filter((x) => x.status !== "resolved").length)} unit="open" variant="plain" />
        <KpiTile label={d.inMaint} value={String(p.maintenance)} unit={d.units.toLowerCase()} variant="plain" />
      </div>
      <GlassCard hover={false} className="p-3 md:p-4">
        <DataTable rows={data ?? []} columns={cols} loading={loading} error={error} onRetry={reload} caption={d.maintTitle}
          card={(x) => <div className="space-y-1.5"><TruncatedText text={x.title} className="font-medium text-ink-900" /><div className="flex flex-wrap items-center gap-2"><StatusCell status={x.status} /><StatusCell status={x.priority} /><span className="text-[12px] text-ink-500">{formatDate(x.createdAt)}</span></div></div>}
          empty={<EmptyState icon={<Wrench className="h-6 w-6" />} title={d.maintEmpty} body={d.maintEmptyBody} />} />
      </GlassCard>
    </div>
  );
}

function FinanceTab({ p }: { p: Property }) {
  const d = t.props.detail;
  const { data, loading, error, reload } = useData(() => invoiceService.list(p.id), [p.id]);
  const inv = data ?? [];
  const collected = inv.filter((x) => x.status === "paid").reduce((a, x) => a + x.amount, 0);
  const arrears = inv.filter((x) => x.status === "overdue" || x.status === "failed").reduce((a, x) => a + x.amount, 0);
  const vacancyLoss = p.rentRoll && p.occupied ? Math.round((p.rentRoll / p.occupied) * p.vacant) : 0;
  const cols: Column<Invoice>[] = [
    { key: "id", header: "Invoice", render: (x) => <span className="font-medium uppercase text-ink-900">{x.id}</span> },
    { key: "due", header: "Due", render: (x) => formatDate(x.dueDate) },
    { key: "amount", header: t.units.cols.rent, render: (x) => <span className="tabular-nums">{formatZAR(x.amount)}</span> },
    { key: "status", header: t.units.cols.status, render: (x) => <StatusCell status={x.status} /> },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile label={d.rentRoll} value={formatZAR(p.rentRoll)} unit="" variant="plain" />
        <KpiTile loading={loading} label={d.collected} value={formatZAR(collected)} unit="" variant="plain" />
        <KpiTile loading={loading} label={d.arrears} value={formatZAR(arrears)} unit="" variant="plain" />
        <KpiTile label={d.vacancyLoss} value={formatZAR(vacancyLoss)} unit="" variant="plain" />
      </div>
      <GlassCard hover={false} className="p-3 md:p-4">
        <h2 className="mb-3 px-1 text-h3 text-ink-900">{d.invoices}</h2>
        <DataTable rows={inv} columns={cols} loading={loading} error={error} onRetry={reload} caption={d.invoices}
          card={(x) => <div className="flex items-center justify-between gap-3"><div><p className="font-medium uppercase text-ink-900">{x.id}</p><p className="text-[12px] text-ink-500">{formatDate(x.dueDate)}</p></div><div className="text-right"><p className="tabular-nums">{formatZAR(x.amount)}</p><StatusCell status={x.status} /></div></div>}
          empty={<EmptyState title={d.noHistory} body={d.noInvoices} />} />
      </GlassCard>
    </div>
  );
}

function StaffTab({ p, canManage }: { p: Property; canManage: boolean }) {
  const d = t.props.detail;
  const { data, loading, error, reload } = useData(() => staffService.list(), []);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string[]>(p.staffIds);
  const [saving, setSaving] = useState(false);
  const all = data ?? [];
  const assigned = all.filter((s) => p.staffIds.includes(s.id));
  const save = async () => {
    setSaving(true);
    try { await staffService.assign(p.id, sel); toast.success(d.assigned); setOpen(false); }
    catch { toast.error(t.common.errorBody); }
    finally { setSaving(false); }
  };
  const btn = canManage && <PillButton icon={<UserPlus className="h-4 w-4" />} onClick={() => { setSel(p.staffIds); setOpen(true); }}>{d.assign}</PillButton>;
  return (
    <GlassCard hover={false} className="p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-h3 text-ink-900">{d.staffTitle}</h2>{assigned.length > 0 && btn}</div>
      {error ? <EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={reload}>{t.common.retry}</PillButton>} />
        : loading ? <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <Skel key={i} className="h-20 rounded-[18px]" />)}</div>
        : assigned.length === 0 ? <EmptyState icon={<Users className="h-6 w-6" />} title={d.staffEmpty} body={d.staffEmptyBody} action={btn || undefined} />
        : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {assigned.map((s: Staff) => (
              <li key={s.id} className="flex min-w-0 items-center gap-3 rounded-[18px] border border-border-soft bg-surface-solid/70 p-3">
                <NAvatar name={s.name} size={40} />
                <div className="min-w-0 flex-1">
                  <TruncatedText text={s.name} className="font-medium text-ink-900" />
                  <TruncatedText text={s.email} className="text-[12px] text-ink-500" />
                </div>
                <StatusChip tone="neutral">{t.roles[s.role]}</StatusChip>
              </li>
            ))}
          </ul>
        )}
      <Modal open={open} onOpenChange={setOpen} title={d.assignTitle}
        footer={<><PillButton variant="secondary" onClick={() => setOpen(false)}>{t.props.form.cancel}</PillButton><PillButton onClick={save} disabled={saving}>{t.props.form.save}</PillButton></>}>
        <ChipMultiSelect label={d.assignTitle} value={sel} onChange={setSel} options={all.map((s) => ({ value: s.id, label: `${s.name} · ${t.roles[s.role]}` }))} />
      </Modal>
    </GlassCard>
  );
}
