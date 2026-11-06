import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { BedDouble, CalendarClock, Copy, ExternalLink, Plus, Search, UserRoundSearch, Users } from "lucide-react";
import { APP_SOURCES, type AppSource, type AppStage } from "@/mocks/leasing";
import { applicationService, type ApplicationView, type Vacancy } from "@/services";
import { EmptyState, GlassCard, PageHeader, PillButton, SegmentedChips, Skel, StatusChip, TruncatedText } from "@/components/nestly/primitives";
import { DataTable, KpiTile, Modal, PersonCell, ProgressCell, type Column } from "@/components/nestly/composites";
import { SelectField, TextAreaField } from "@/components/nestly/forms";
import { TextField } from "@/components/nestly/auth";
import { FadeImage } from "@/components/nestly/fade-image";
import { fill, resolvePhoto } from "@/components/nestly/properties/shared";
import { ErrorCard } from "@/components/nestly/billing/OwnerBilling";
import { copyText, todayIso } from "@/components/nestly/leasing/shared";
import { freeSlots, VIEWING_SLOTS } from "@/lib/leasing-rules";
import { emailField, phoneField } from "@/lib/validation";
import { useAppState } from "@/lib/app-state";
import { useData } from "@/lib/use-data";
import { formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { ApplicantPanel, StageChip } from "./ApplicantPanel";

const a = t.apps;
export const APP_VIEWS = ["pipeline", "vacancies", "viewings", "applicants"] as const;
export type AppViewKey = (typeof APP_VIEWS)[number];
export type AppSearch = { view?: AppViewKey | undefined; id?: string | undefined };
type SetSearch = (p: Partial<AppSearch>, replace?: boolean) => void;
const BOARD: AppStage[] = ["enquiry", "viewing", "applied", "screening", "approved"];
const addDays = (iso: string, n: number) => { const x = new Date(`${iso}T00:00:00`); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
export const applyUrl = (unitId: string) => `${typeof window === "undefined" ? "" : window.location.origin}/apply/${unitId}`;

export function OwnerApplications({ view, id, set }: { view: AppViewKey; id?: string | undefined; set: SetSearch }) {
  const { propertyId } = useAppState();
  const apps = useData(() => applicationService.list(propertyId), [propertyId]);
  const vacs = useData(() => applicationService.vacancies(propertyId), [propertyId]);
  const [enquiry, setEnquiry] = useState(false);
  const [schedUnit, setSchedUnit] = useState("");
  const all = apps.data ?? [];
  const today = todayIso();
  const openApps = all.filter((x) => x.stage !== "approved" && x.stage !== "declined");
  const ready = all.filter((x) => x.ready && x.stage !== "approved" && x.stage !== "declined").length;
  const weekEnd = addDays(today, 7);
  const loading = apps.loading || vacs.loading;
  const sel = all.find((x) => x.id === id) ?? null;
  return (
    <div className="space-y-6">
      <PageHeader title={a.title} muted={a.muted} sub={apps.data && vacs.data ? fill(a.sub, { vacant: vacs.data.length, open: openApps.length, ready }) : undefined}
        actions={<PillButton onClick={() => setEnquiry(true)} icon={<Plus className="h-4 w-4" />}>{a.addEnquiry}</PillButton>} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiTile loading={loading} label={a.kpi.vacancies} value={String(vacs.data?.length ?? 0)} variant="plain" />
        <KpiTile loading={loading} label={a.kpi.enquiries} value={String(all.filter((x) => x.createdAt >= addDays(today, -7)).length)} variant="plain" />
        <KpiTile loading={loading} label={a.kpi.viewings} value={String(all.filter((x) => x.viewing?.state === "booked" && x.viewing.date >= today && x.viewing.date <= weekEnd).length)} variant="plain" />
        <KpiTile loading={loading} label={a.kpi.ready} value={String(ready)} variant="plain" />
      </div>
      <SegmentedChips label={a.title} value={view} onChange={(v) => set({ view: v === "pipeline" ? undefined : v, id: undefined })} options={APP_VIEWS.map((v) => ({ value: v, label: a.views[v] }))} />
      {apps.error || vacs.error ? <ErrorCard onRetry={() => { apps.reload(); vacs.reload(); }} />
        : view === "pipeline" ? <Pipeline apps={all} loading={loading} onOpen={(i) => set({ id: i }, false)} />
        : view === "vacancies" ? <Vacancies data={vacs.data ?? []} loading={loading} onBook={(u) => { setSchedUnit(u); set({ view: "viewings", id: undefined }); }} />
        : view === "viewings" ? <Viewings apps={all} vacancies={vacs.data ?? []} loading={loading} unitId={schedUnit} setUnitId={setSchedUnit} onOpen={(i) => set({ id: i }, false)} />
        : <Applicants apps={all} loading={loading} id={id} onOpen={(i) => set({ id: i }, false)} />}
      <ApplicantPanel x={sel} all={all} onClose={() => set({ id: undefined })} />
      {enquiry && <EnquiryModal vacancies={vacs.data ?? []} onClose={() => setEnquiry(false)} onAdded={(nid) => set({ id: nid }, false)} />}
    </div>
  );
}

const match = (x: ApplicationView, q: string) => !q.trim() || `${x.name} ${x.email} ${x.unitLabel} ${x.propertyName}`.toLowerCase().includes(q.trim().toLowerCase());
function SearchBox({ q, setQ }: { q: string; setQ: (v: string) => void }) {
  return <label className="relative block min-w-0 flex-1 sm:max-w-xs"><span className="sr-only">{a.search}</span><Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={a.search} className="h-11 w-full rounded-[5.75px] border border-input bg-surface-solid pl-9 pr-3 text-[15px] outline-none focus:border-olive-700" /></label>;
}

/* ---------- Pipeline board ---------- */
function Pipeline({ apps, loading, onOpen }: { apps: ApplicationView[]; loading: boolean; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [declined, setDeclined] = useState(false);
  const cols = declined ? [...BOARD, "declined" as const] : BOARD;
  const rows = apps.filter((x) => match(x, q));
  if (!loading && !apps.length) return <GlassCard hover={false}><EmptyState icon={<UserRoundSearch className="h-6 w-6" />} title={a.emptyTitle} body={a.emptyBody} /></GlassCard>;
  return (
    <div className="space-y-3">
      <GlassCard hover={false} className="flex flex-wrap items-center gap-2 p-3 md:p-4">
        <SearchBox q={q} setQ={setQ} />
        <PillButton variant="ghost" size="sm" className="ml-auto" onClick={() => setDeclined((v) => !v)}>{declined ? a.hideDeclined : a.showDeclined} ({apps.filter((x) => x.stage === "declined").length})</PillButton>
      </GlassCard>
      <div className="-mx-1 overflow-x-auto px-1 pb-2" role="region" aria-label={a.views.pipeline} tabIndex={0}>
        <div className="grid auto-cols-[minmax(232px,1fr)] grid-flow-col gap-3">
          {cols.map((stage) => {
            const items = rows.filter((x) => x.stage === stage);
            return (
              <section key={stage} aria-label={a.stages[stage]} className="glass flex min-w-0 flex-col gap-2 rounded-[8.05px] p-3">
                <header className="flex items-center justify-between gap-2 px-1"><h2 className="text-[14px] font-semibold text-ink-900">{a.stages[stage]}</h2><span className="rounded-full bg-surface-solid px-2 text-[12px] font-medium tabular-nums text-ink-500">{loading ? "…" : items.length}</span></header>
                {loading ? [0, 1].map((i) => <Skel key={i} className="h-24" />) : !items.length ? <p className="rounded-[5.75px] border border-dashed border-border-soft px-3 py-6 text-center text-[13px] text-ink-500">{a.emptyCol}</p> : (
                  <ul className="space-y-2">
                    {items.map((x) => (
                      <li key={x.id}>
                        <button type="button" onClick={() => onOpen(x.id)} className="block w-full space-y-2 rounded-[5.75px] border border-border-soft bg-surface-solid p-3 text-left shadow-soft transition hover:border-olive-700/40 focus-visible:ring-2 focus-visible:ring-olive-700">
                          <TruncatedText text={x.name} className="text-[14px] font-medium text-ink-900" />
                          <TruncatedText text={`${x.unitLabel} · ${x.propertyName}`} className="text-[12px] text-ink-500" />
                          {(stage === "applied" || stage === "screening") && <ProgressCell value={x.progress.pct} />}
                          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-500">
                            <span>{a.sources[x.source]}</span>
                            {x.viewing?.state === "booked" && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" aria-hidden />{formatDate(x.viewing.date)} {x.viewing.time}</span>}
                            {x.ready && stage !== "approved" && <StatusChip tone="success">{a.scr.readyBadge}</StatusChip>}
                            {stage === "approved" && x.tenantId && <StatusChip tone="strong">{a.detail.converted.split(" ")[0]}</StatusChip>}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Applicants table ---------- */
function Applicants({ apps, loading, id, onOpen }: { apps: ApplicationView[]; loading: boolean; id?: string | undefined; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<"all" | AppStage>("all");
  const rows = apps.filter((x) => (f === "all" || x.stage === f) && match(x, q));
  const columns: Column<ApplicationView>[] = [
    { key: "n", header: a.cols.applicant, render: (x) => <PersonCell name={x.name} email={x.email} /> },
    { key: "u", header: a.cols.unit, render: (x) => <div className="min-w-0 max-w-[200px]"><TruncatedText text={x.unitLabel} className="text-ink-900" /><TruncatedText text={x.propertyName} className="text-[12px] text-ink-500" /></div> },
    { key: "s", header: a.cols.stage, render: (x) => <StageChip s={x.stage} /> },
    { key: "i", header: a.cols.income, className: "text-right", render: (x) => <span className="tabular-nums">{x.income ? formatZAR(x.income) : "—"}</span> },
    { key: "r", header: a.cols.afford, render: (x) => (x.afford ? <span className={cn("tabular-nums", x.afford.result === "fail" ? "text-danger" : x.afford.result === "concern" ? "text-warning-ink" : "text-ink-900")}>{String(x.afford.ratio).replace(".", ",")}%</span> : <span className="text-ink-500">—</span>) },
    { key: "c", header: a.cols.screening, render: (x) => <ProgressCell value={x.progress.pct} /> },
    { key: "d", header: a.cols.applied, render: (x) => <span className="text-ink-500">{formatDate(x.createdAt)}</span> },
  ];
  const card = (x: ApplicationView) => (
    <div className="space-y-2">
      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><TruncatedText text={x.name} className="font-medium text-ink-900" /><TruncatedText text={`${x.unitLabel} · ${x.propertyName}`} className="text-[12px] text-ink-500" /></div><StageChip s={x.stage} /></div>
      <div className="flex items-center justify-between gap-2 text-[13px] text-ink-500"><ProgressCell value={x.progress.pct} /><span className="tabular-nums">{x.income ? formatZAR(x.income, { decimals: false }) : "—"}</span></div>
    </div>
  );
  const stages: ("all" | AppStage)[] = ["all", "enquiry", "viewing", "applied", "screening", "approved", "declined"];
  return (
    <div className="space-y-3">
      <GlassCard hover={false} className="space-y-3 p-3 md:p-4">
        <SearchBox q={q} setQ={setQ} />
        <SegmentedChips wrap label={a.cols.stage} value={f} onChange={setF} options={stages.map((s) => ({ value: s, label: s === "all" ? t.lease.all : a.stages[s], count: s === "all" ? apps.length : apps.filter((x) => x.stage === s).length }))} />
      </GlassCard>
      <GlassCard hover={false} className="p-3 md:p-4">
        <DataTable rows={rows} columns={columns} loading={loading} caption={a.views.applicants} selectedId={id} onSelect={onOpen} card={card}
          empty={apps.length ? <EmptyState icon={<Search className="h-6 w-6" />} title={a.zeroTitle} action={<PillButton variant="secondary" onClick={() => { setQ(""); setF("all"); }}>{t.lease.clear}</PillButton>} /> : <EmptyState icon={<Users className="h-6 w-6" />} title={a.emptyTitle} body={a.emptyBody} />} />
      </GlassCard>
    </div>
  );
}

/* ---------- Vacancies ---------- */
function Vacancies({ data, loading, onBook }: { data: Vacancy[]; loading: boolean; onBook: (unitId: string) => void }) {
  const v = a.vac;
  if (loading) return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skel key={i} className="h-72" />)}</div>;
  if (!data.length) return <GlassCard hover={false}><EmptyState icon={<BedDouble className="h-6 w-6" />} title={v.title} body={v.none} /></GlassCard>;
  const copy = async (u: string) => { if (await copyText(applyUrl(u))) toast.success(v.copied); else toast.error(t.common.errorBody); };
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {data.map((x) => {
        const src = resolvePhoto(x.photo);
        return (
          <li key={x.unitId} className="min-w-0">
            <GlassCard className="flex h-full flex-col gap-3 p-3">
              <div className="relative aspect-[16/9] overflow-hidden rounded-[5.75px] bg-olive-200">
                {src && <FadeImage src={src} alt={`${x.propertyName} ${x.label}`} width={640} height={360} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                <span className="absolute left-2 top-2"><StatusChip tone={x.status === "notice" ? "warning" : "info"} dot>{x.status === "notice" ? v.notice : v.vacant}</StatusChip></span>
              </div>
              <div className="flex items-start gap-2 px-1">
                <div className="min-w-0 flex-1"><TruncatedText text={`${x.label} · ${x.propertyName}`} as="h3" className="text-h3 text-ink-900" /><p className="text-[13px] text-ink-500">{fill(v.beds, { beds: x.beds, baths: x.baths })} · {x.availableFrom <= todayIso() ? v.now : fill(v.available, { date: formatDate(x.availableFrom) })}</p></div>
                <div className="shrink-0 text-right"><p className="text-[15px] font-semibold tabular-nums text-ink-900">{formatZAR(x.rent, { decimals: false })}</p><p className="text-[12px] text-ink-500">{x.applicants === 1 ? v.applicant : fill(v.applicants, { n: x.applicants })}</p></div>
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5 px-1 pb-1">
                <PillButton size="sm" onClick={() => copy(x.unitId)} icon={<Copy className="h-3.5 w-3.5" />}>{v.copy}</PillButton>
                <Link to="/apply/$unitId" params={{ unitId: x.unitId }} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-olive-700 hover:bg-olive-100"><ExternalLink className="h-3.5 w-3.5" aria-hidden />{v.open}</Link>
                <PillButton size="sm" variant="ghost" onClick={() => onBook(x.unitId)}>{a.detail.bookViewing}</PillButton>
              </div>
            </GlassCard>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Viewing scheduler ---------- */
function Viewings({ apps, vacancies, loading, unitId, setUnitId, onOpen }: { apps: ApplicationView[]; vacancies: Vacancy[]; loading: boolean; unitId: string; setUnitId: (u: string) => void; onOpen: (id: string) => void }) {
  const v = a.view;
  const today = todayIso();
  const unit = vacancies.find((x) => x.unitId === unitId) ?? vacancies[0];
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i)), [today]);
  const [day, setDay] = useState(today);
  const [time, setTime] = useState("");
  const [who, setWho] = useState("");
  const [busy, setBusy] = useState(false);
  const booked = apps.filter((x) => x.unitId === unit?.unitId && x.viewing?.state === "booked").map((x) => x.viewing!);
  const free = freeSlots(day, booked, new Date());
  const candidates = apps.filter((x) => x.unitId === unit?.unitId && x.stage !== "approved" && x.stage !== "declined" && x.viewing?.state !== "booked");
  const upcoming = apps.filter((x) => x.viewing?.state === "booked").sort((p, q) => `${p.viewing!.date}${p.viewing!.time}`.localeCompare(`${q.viewing!.date}${q.viewing!.time}`));
  const past = apps.filter((x) => x.viewing && x.viewing.state !== "booked");
  const book = async () => {
    const x = candidates.find((c) => c.id === who);
    if (!x || !time) return;
    setBusy(true);
    try { await applicationService.bookViewing(x.id, day, time); toast.success(fill(v.booked, { name: x.name })); setTime(""); setWho(""); } catch { toast.error(t.common.errorBody); } finally { setBusy(false); }
  };
  const act = async (x: ApplicationView, s: "done" | "no_show" | "cancel") => { await applicationService.setViewing(x.id, s); toast.success(s === "done" ? v.markedDone : s === "no_show" ? v.markedNoShow : v.cancelled); };
  const wd = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-ZA", { weekday: "short" });
  const month = new Date(`${day}T00:00:00`).toLocaleDateString("en-ZA", { month: "long", year: "numeric" });

  if (loading) return <div className="grid gap-4 lg:grid-cols-2"><Skel className="h-96" /><Skel className="h-96" /></div>;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <GlassCard hover={false} className="space-y-5 p-4 md:p-5">
        <div><h2 className="text-h3 text-ink-900">{v.title}</h2><p className="text-[13px] text-ink-500">{v.sub}</p></div>
        {!vacancies.length ? <p className="text-[14px] text-ink-500">{a.vac.none}</p> : <>
          <SelectField label={v.unit} value={unit?.unitId ?? ""} onChange={(e) => { setUnitId(e.target.value); setTime(""); setWho(""); }}>{vacancies.map((x) => <option key={x.unitId} value={x.unitId}>{`${x.label} · ${x.propertyName}`}</option>)}</SelectField>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2"><h3 className="text-[17px] font-medium text-ink-900">{v.dayTitle}</h3><span className="text-[12px] text-ink-500">{month}</span></div>
            <div role="radiogroup" aria-label={v.dayTitle} className="grid grid-cols-7 gap-1.5">
              {days.map((iso) => (
                <button key={iso} type="button" role="radio" aria-checked={day === iso} aria-label={formatDate(iso)} onClick={() => { setDay(iso); setTime(""); }}
                  className={cn("flex h-16 flex-col items-center justify-center rounded-full border text-center transition-colors", day === iso ? "border-olive-800 bg-olive-800 text-primary-foreground" : "border-border-soft bg-surface-solid text-ink-900 hover:bg-olive-100")}>
                  <span className={cn("text-[10px] uppercase tracking-[0.06em]", day === iso ? "text-on-dark-muted" : "text-ink-500")}>{wd(iso)}</span>
                  <span className="text-[16px] tabular-nums">{Number(iso.slice(8))}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2"><h3 className="text-[17px] font-medium text-ink-900">{v.timeTitle}</h3><span className="text-[12px] text-ink-500">{v.walk}</span></div>
            <div role="radiogroup" aria-label={v.timeTitle} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {VIEWING_SLOTS.map((s) => {
                const ok = free.includes(s);
                return <button key={s} type="button" role="radio" aria-checked={time === s} disabled={!ok} aria-label={ok ? fill(v.pick, { time: s }) : `${s} — ${t.common.emptyTitle}`} onClick={() => setTime(s)}
                  className={cn("h-11 rounded-[5.75px] border text-[14px] tabular-nums transition-colors", time === s ? "border-olive-800 bg-olive-800 text-primary-foreground" : ok ? "border-border-soft bg-surface-solid text-ink-900 hover:bg-olive-100" : "cursor-not-allowed border-border-soft bg-surface-solid/40 text-ink-500/50 line-through")}>{s}</button>;
              })}
            </div>
            {!free.length && <p className="text-[13px] text-ink-500">{v.noSlots}</p>}
          </div>
          {!candidates.length ? <p className="rounded-[5.75px] bg-olive-100/60 p-3 text-[13px] text-ink-700">{v.none}</p> : (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <SelectField label={v.applicant} value={who} onChange={(e) => setWho(e.target.value)}><option value="">{v.pickApplicant}</option>{candidates.map((x) => <option key={x.id} value={x.id}>{`${x.name} · ${a.stages[x.stage]}`}</option>)}</SelectField>
              <PillButton onClick={book} disabled={busy || !time || !who} icon={<CalendarClock className="h-4 w-4" />}>{busy ? t.common.working : time ? `${v.book} ${time}` : v.book}</PillButton>
            </div>
          )}
        </>}
      </GlassCard>
      <GlassCard hover={false} className="space-y-4 p-4 md:p-5">
        <h2 className="text-h3 text-ink-900">{v.upcoming}</h2>
        {!upcoming.length ? <p className="text-[14px] text-ink-500">{v.noneUpcoming}</p> : (
          <ul className="space-y-2">{upcoming.map((x) => (
            <li key={x.id} className="space-y-2 rounded-[5.75px] border border-border-soft bg-surface-solid/80 p-3">
              <div className="flex items-start gap-3">
                <div className="grid w-12 shrink-0 place-items-center rounded-[5.75px] bg-olive-100 py-1 text-center"><span className="text-[10px] uppercase text-ink-500">{wd(x.viewing!.date)}</span><span className="text-[16px] font-medium tabular-nums text-ink-900">{Number(x.viewing!.date.slice(8))}</span></div>
                <button type="button" onClick={() => onOpen(x.id)} className="min-w-0 flex-1 text-left"><TruncatedText text={x.name} className="font-medium text-ink-900" /><TruncatedText text={`${x.viewing!.time} · ${x.unitLabel} · ${x.propertyName}`} className="text-[12px] text-ink-500" /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <PillButton size="sm" variant="secondary" onClick={() => act(x, "done")}>{v.done}</PillButton>
                <PillButton size="sm" variant="ghost" onClick={() => act(x, "no_show")}>{v.noShow}</PillButton>
                <PillButton size="sm" variant="ghost" onClick={() => act(x, "cancel")}>{v.cancel}</PillButton>
              </div>
            </li>
          ))}</ul>
        )}
        {past.length > 0 && <>
          <h3 className="text-overline text-ink-500">{v.past}</h3>
          <ul className="space-y-1.5">{past.map((x) => (
            <li key={x.id}><button type="button" onClick={() => onOpen(x.id)} className="flex w-full min-w-0 items-center gap-2 rounded-[5.75px] px-2 py-1.5 text-left text-[13px] hover:bg-olive-100/60">
              <span className="w-24 shrink-0 tabular-nums text-ink-500">{formatDate(x.viewing!.date)}</span><TruncatedText text={x.name} className="flex-1 text-ink-900" /><StatusChip tone={x.viewing!.state === "done" ? "success" : "danger"}>{v.states[x.viewing!.state]}</StatusChip>
            </button></li>
          ))}</ul>
        </>}
      </GlassCard>
    </div>
  );
}

/* ---------- Add enquiry ---------- */
function EnquiryModal({ vacancies, onClose, onAdded }: { vacancies: Vacancy[]; onClose: () => void; onAdded: (id: string) => void }) {
  const e = a.enquiry;
  const [v, setV] = useState({ name: "", email: "", phone: "", unitId: vacancies[0]?.unitId ?? "", source: "property24" as AppSource, message: "" });
  const [errs, setErrs] = useState<Partial<Record<keyof typeof v, string>>>({});
  const [busy, setBusy] = useState(false);
  const up = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));
  const submit = async () => {
    const er: typeof errs = {};
    if (v.name.trim().length < 2) er.name = e.errs.name;
    if (!emailField.safeParse(v.email).success) er.email = e.errs.email;
    if (!phoneField.safeParse(v.phone).success) er.phone = e.errs.phone;
    if (!v.unitId) er.unitId = e.errs.unit;
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try { const id = await applicationService.addEnquiry({ name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), unitId: v.unitId, source: v.source, message: v.message.trim() }); toast.success(e.added); onAdded(id); onClose(); } catch { toast.error(t.common.errorBody); } finally { setBusy(false); }
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={e.title}
      footer={<><PillButton variant="secondary" onClick={onClose}>{t.common.cancel}</PillButton><PillButton onClick={submit} disabled={busy}>{busy ? t.common.working : e.submit}</PillButton></>}>
      <div className="space-y-4">
        <TextField label={e.name} value={v.name} error={errs.name} autoComplete="off" onChange={(x) => up("name", x.target.value)} />
        <TextField label={e.email} type="email" value={v.email} error={errs.email} onChange={(x) => up("email", x.target.value)} />
        <TextField label={e.phone} type="tel" placeholder="+27 82 555 0123" value={v.phone} error={errs.phone} onChange={(x) => up("phone", x.target.value)} />
        <SelectField label={e.unit} value={v.unitId} error={errs.unitId} onChange={(x) => up("unitId", x.target.value)}>{!vacancies.length && <option value="">{a.vac.none}</option>}{vacancies.map((x) => <option key={x.unitId} value={x.unitId}>{`${x.label} · ${x.propertyName}`}</option>)}</SelectField>
        <SelectField label={e.source} value={v.source} onChange={(x) => up("source", x.target.value)}>{APP_SOURCES.map((s) => <option key={s} value={s}>{a.sources[s]}</option>)}</SelectField>
        <TextAreaField label={e.message} rows={3} value={v.message} onChange={(x) => up("message", x.target.value)} />
      </div>
    </Modal>
  );
}
