import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Pin, Plus } from "lucide-react";
import { announcementService, noticeService, propertyService, tenantService, unitService, ANN_CATEGORIES, type AnnCategory, type AnnChannel, type AnnInput, type AnnouncementView, type Audience } from "@/services";
import { DataTable, KpiTile, type Column } from "@/components/nestly/composites";
import { EmptyState, GlassCard, PageHeader, PillButton, ProgressBar, SegmentedChips, Skel, StatusChip, TruncatedText, type Tone } from "@/components/nestly/primitives";
import { SidePanel, ConfirmDialog } from "@/components/nestly/overlays";
import { ChipMultiSelect, SelectField, TextAreaField, ToggleRow } from "@/components/nestly/forms";
import { TextField } from "@/components/nestly/auth";
import { fill } from "@/components/nestly/properties/shared";
import { ErrorCard } from "@/components/nestly/billing/OwnerBilling";
import { DeliveryChip } from "./LegalPage";
import { audienceAllowed } from "@/lib/announcement-rules";
import { useAppState } from "@/lib/app-state";
import { useAccess } from "@/lib/access";
import { useData } from "@/lib/use-data";
import { readSession } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

const n = t.ann;
const STONE: Record<AnnouncementView["status"], Tone> = { draft: "neutral", scheduled: "info", sent: "success" };
const CTONE: Record<AnnCategory, Tone> = { general: "neutral", maintenance: "info", emergency: "danger", rules: "warning", event: "success" };
const when = (a: AnnouncementView) => a.sentAt ?? a.scheduledFor ?? a.createdAt;

export function AnnouncementsPage() {
  const { role } = useAppState();
  return role === "tenant" ? <NoticeBoard /> : <OwnerAnnouncements />;
}

function OwnerAnnouncements() {
  const { propertyId } = useAppState();
  const { can } = useAccess();
  const data = useData(() => announcementService.list(propertyId), [propertyId]);
  const [view, setView] = useState<"all" | "sent" | "scheduled" | "draft">("all");
  const [edit, setEdit] = useState<AnnouncementView | "new" | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const all = data.data ?? [];
  const rows = all.filter((a) => view === "all" || a.shownStatus === view);
  const sent = all.filter((a) => a.shownStatus === "sent");
  const avg = sent.length ? Math.round(sent.reduce((x, a) => x + a.readPct, 0) / sent.length) : 0;
  const cols: Column<AnnouncementView>[] = [
    { key: "t", header: n.f.title, render: (a) => <div className="flex min-w-0 max-w-[300px] items-center gap-2">{a.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-olive-700" aria-label={n.pinned} />}<TruncatedText text={a.title} className="font-medium text-ink-900" /></div> },
    { key: "c", header: n.f.category, render: (a) => <StatusChip tone={CTONE[a.category]}>{n.categories[a.category]}</StatusChip> },
    { key: "a", header: n.audience.label, render: (a) => <div className="max-w-[200px]"><TruncatedText text={a.audienceLabel} /></div> },
    { key: "w", header: n.f.when, render: (a) => formatDate(when(a)) },
    { key: "r", header: n.kpi.read, render: (a) => (a.shownStatus === "sent" ? <div className="w-28"><ProgressBar value={a.readPct} label={fill(n.reads, { reads: a.reads, n: a.recipients })} /></div> : "—") },
    { key: "s", header: t.legalDesk.cols.status, render: (a) => <StatusChip tone={STONE[a.shownStatus]} dot>{n.statuses[a.shownStatus]}</StatusChip> },
  ];
  const s = all.find((a) => a.id === sel);
  return (
    <div className="space-y-6">
      <PageHeader title={n.title} muted={n.muted} sub={fill(n.sub, { sent: sent.length, scheduled: all.filter((a) => a.shownStatus === "scheduled").length })}
        actions={can("announcements", "create") && <PillButton onClick={() => setEdit("new")} icon={<Plus className="h-4 w-4" />}>{n.new}</PillButton>} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiTile loading={data.loading} label={n.kpi.sent} value={String(sent.length)} />
        <KpiTile loading={data.loading} label={n.kpi.scheduled} value={String(all.filter((a) => a.shownStatus === "scheduled").length)} />
        <KpiTile loading={data.loading} label={n.kpi.read} value={`${avg}%`} variant="donut" percent={avg} tip={`${avg}%`} />
        <KpiTile loading={data.loading} label={n.kpi.reach} value={String(sent.reduce((x, a) => x + a.recipients, 0))} />
      </div>
      <SegmentedChips label={n.title} value={view} onChange={setView} options={(["all", "sent", "scheduled", "draft"] as const).map((v) => ({ value: v, label: n.views[v] }))} />
      {data.error ? <ErrorCard onRetry={data.reload} /> : (
        <GlassCard hover={false}>
          <DataTable caption={n.title} rows={rows} columns={cols} loading={data.loading} onSelect={setSel} selectedId={sel ?? undefined}
            empty={<EmptyState icon={<Megaphone className="h-6 w-6" />} title={n.empty} body={n.emptyBody} />}
            card={(a) => <button type="button" onClick={() => setSel(a.id)} className="w-full min-w-0 space-y-1 text-left"><div className="flex items-center justify-between gap-2"><TruncatedText text={a.title} className="font-medium" /><StatusChip tone={STONE[a.shownStatus]} dot>{n.statuses[a.shownStatus]}</StatusChip></div><TruncatedText text={`${a.audienceLabel} · ${formatDate(when(a))}`} className="text-[12px] text-ink-500" /></button>} />
        </GlassCard>
      )}
      <SidePanel open={!!s} onOpenChange={(o) => !o && setSel(null)} title={s?.title ?? ""} wide
        footer={s && can("announcements", "edit") && <>
          {s.shownStatus === "draft" && <><PillButton size="sm" variant="secondary" onClick={() => { setEdit(s); setSel(null); }}>{n.edit}</PillButton><PillButton size="sm" variant="danger" onClick={() => setDel(true)}>{n.del}</PillButton></>}
          {s.shownStatus === "scheduled" && <PillButton size="sm" variant="secondary" onClick={async () => { await announcementService.cancelSchedule(s.id); toast.success(n.cancelled); }}>{n.cancel}</PillButton>}
          {s.shownStatus === "sent" && <PillButton size="sm" variant="secondary" onClick={() => void announcementService.togglePin(s.id)}>{s.pinned ? n.unpin : n.pin}</PillButton>}
        </>}>
        {s && <div className="space-y-4">
          <div className="flex flex-wrap gap-2"><StatusChip tone={STONE[s.shownStatus]} dot>{n.statuses[s.shownStatus]}</StatusChip><StatusChip tone={CTONE[s.category]}>{n.categories[s.category]}</StatusChip></div>
          <BoardCard title={s.title} body={s.body} category={s.category} date={when(s)} by={s.createdBy} pinned={s.pinned} />
          <dl className="grid grid-cols-2 gap-3 text-[13px]"><div><dt className="text-ink-500">{n.audience.label}</dt><dd><TruncatedText text={s.audienceLabel} /></dd></div><div><dt className="text-ink-500">{n.f.channels}</dt><dd>{s.channels.map((c) => n.channels[c]).join(", ")}</dd></div>
            {s.shownStatus === "sent" && <div className="col-span-2"><dt className="text-ink-500">{n.kpi.read}</dt><dd><ProgressBar value={s.readPct} label={fill(n.reads, { reads: s.reads, n: s.recipients })} /></dd></div>}</dl>
        </div>}
      </SidePanel>
      {s && <ConfirmDialog open={del} onOpenChange={setDel} title={n.del} body={s.title} onConfirm={async () => { await announcementService.remove(s.id); toast.success(n.deleted); setSel(null); }} />}
      {edit && <Composer init={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

export function BoardCard({ title, body, category, date, by, pinned, unread }: { title: string; body: string; category: AnnCategory; date: string; by: string; pinned?: boolean; unread?: boolean }) {
  return (
    <article className={cn("rounded-[5.75px] border bg-surface-solid p-4", category === "emergency" ? "border-danger/40" : "border-border-soft")}>
      <div className="mb-2 flex flex-wrap items-center gap-2"><StatusChip tone={CTONE[category]}>{n.categories[category]}</StatusChip>{pinned && <StatusChip tone="strong">{n.pinned}</StatusChip>}{unread && <StatusChip tone="info" dot>{n.newBadge}</StatusChip>}<span className="ml-auto text-[12px] text-ink-500">{formatDate(date)}</span></div>
      <h3 className="text-h3 text-ink-900">{title || "—"}</h3>
      <p className="mt-1 whitespace-pre-line text-[14px] text-ink-500">{body || "—"}</p>
      <p className="mt-2 text-[12px] text-ink-500">{fill(n.by, { name: by })}</p>
    </article>
  );
}

function Composer({ init, onClose }: { init?: AnnouncementView | undefined; onClose: () => void }) {
  const { scope, propertyId } = useAppState();
  const props = useData(() => propertyService.list(), []).data ?? [];
  const [f, setF] = useState({
    title: init?.title ?? "", body: init?.body ?? "", category: (init?.category ?? "general") as AnnCategory, channels: (init?.channels ?? ["inapp"]) as AnnChannel[], pinned: init?.pinned ?? false,
    kind: (init?.audience.kind ?? (scope === "all" ? "all" : "property")) as Audience["kind"], propertyId: init && init.audience.kind !== "all" ? init.audience.propertyId : propertyId !== "all" ? propertyId : scope === "all" ? "" : scope[0] ?? "",
    unitIds: init?.audience.kind === "units" ? init.audience.unitIds : ([] as string[]), mode: "now" as AnnInput["mode"], at: "",
  });
  const pid = f.propertyId || props[0]?.id || "";
  const units = useData(() => (pid ? unitService.listByProperty(pid) : Promise.resolve([])), [pid]).data ?? [];
  const audience: Audience = f.kind === "all" ? { kind: "all" } : f.kind === "property" ? { kind: "property", propertyId: pid } : { kind: "units", propertyId: pid, unitIds: f.unitIds };
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (mode: AnnInput["mode"]) => {
    if (!f.title.trim() || !f.body.trim() || !f.channels.length || (f.kind === "units" && !f.unitIds.length) || !audienceAllowed(audience, scope)) { setErr(n.f.errs); return; }
    const at = f.at ? `${f.at}:00` : "";
    if (mode === "schedule" && (!at || at <= new Date().toISOString().slice(0, 19))) { setErr(n.f.past); return; }
    setBusy(true);
    try { await announcementService.save({ title: f.title, body: f.body, category: f.category, audience, channels: f.channels, pinned: f.pinned, mode, scheduledFor: at || undefined }, init?.id); toast.success(n.saved[mode]); onClose(); } finally { setBusy(false); }
  };
  return (
    <SidePanel open onOpenChange={(o) => !o && onClose()} title={n.new} wide
      footer={<>
        <PillButton variant="ghost" disabled={busy} onClick={() => submit("draft")}>{n.f.draft}</PillButton>
        <PillButton disabled={busy} onClick={() => submit(f.mode)}>{f.mode === "schedule" ? n.f.later : n.f.now}</PillButton>
      </>}>
      <div className="space-y-4">
        <TextField label={n.f.title} value={f.title} maxLength={90} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <TextAreaField label={n.f.body} value={f.body} maxLength={1000} onChange={(e) => setF({ ...f, body: e.target.value })} />
        <SelectField label={n.f.category} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as AnnCategory })}>{ANN_CATEGORIES.map((c) => <option key={c} value={c}>{n.categories[c]}</option>)}</SelectField>
        <div className="space-y-2">
          <p className="text-[14px] font-medium">{n.audience.label}</p>
          <SegmentedChips label={n.audience.label} value={f.kind} onChange={(v) => setF({ ...f, kind: v })} options={[...(scope === "all" ? [{ value: "all" as const, label: n.audience.all }] : []), { value: "property" as const, label: n.audience.property }, { value: "units" as const, label: n.audience.units }]} />
          {f.kind !== "all" && <SelectField label={n.audience.pickProperty} value={pid} onChange={(e) => setF({ ...f, propertyId: e.target.value, unitIds: [] })}>{props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectField>}
          {f.kind === "units" && <ChipMultiSelect label={n.audience.pickUnits} value={f.unitIds} onChange={(v) => setF({ ...f, unitIds: v })} options={units.filter((u) => u.status !== "vacant").map((u) => ({ value: u.id, label: u.label }))} />}
          <p className="text-[12px] text-ink-500">{fill(n.audience.recipients, { n: announcementService.recipients(audience) })}</p>
        </div>
        <div className="space-y-2"><p className="text-[14px] font-medium">{n.f.channels}</p><ChipMultiSelect label={n.f.channels} value={f.channels} onChange={(v) => setF({ ...f, channels: v })} options={(["inapp", "email", "whatsapp", "sms"] as AnnChannel[]).map((c) => ({ value: c, label: n.channels[c] }))} /></div>
        <ToggleRow label={n.f.pin} checked={f.pinned} onChange={(v) => setF({ ...f, pinned: v })} />
        <div className="space-y-2"><p className="text-[14px] font-medium">{n.f.when}</p>
          <SegmentedChips label={n.f.when} value={f.mode === "schedule" ? "schedule" : "now"} onChange={(v) => setF({ ...f, mode: v })} options={[{ value: "now" as const, label: n.f.now }, { value: "schedule" as const, label: n.f.later }]} />
          {f.mode === "schedule" && <TextField label={n.f.at} type="datetime-local" value={f.at} onChange={(e) => setF({ ...f, at: e.target.value })} />}
        </div>
        <div className="space-y-2"><p className="text-[14px] font-medium">{n.f.preview}</p><BoardCard title={f.title} body={f.body} category={f.category} date={new Date().toISOString()} by={readSession()?.name ?? "Janice Tinto"} pinned={f.pinned} unread /></div>
        {err && <p role="alert" className="text-[13px] text-danger">{err}</p>}
      </div>
    </SidePanel>
  );
}

function NoticeBoard() {
  const me = useData(() => tenantService.me(readSession()?.email), []);
  const tid = me.data?.id;
  const list = useData(() => (tid ? announcementService.forTenant(tid) : Promise.resolve([])), [tid]);
  const formal = useData(() => (tid ? noticeService.forTenant(tid) : Promise.resolve([])), [tid]);
  const loading = me.loading || list.loading;
  return (
    <div className="space-y-6">
      <PageHeader title={n.tenantTitle} muted={n.tenantMuted} sub={n.tenantSub} />
      {list.error ? <ErrorCard onRetry={list.reload} /> : loading ? <div className="space-y-3">{[0, 1].map((i) => <Skel key={i} className="h-32 w-full" />)}</div> : !(list.data ?? []).length ? (
        <GlassCard hover={false}><EmptyState icon={<Megaphone className="h-6 w-6" />} title={n.tenantEmpty} body={n.tenantEmptyBody} /></GlassCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(list.data ?? []).map((a) => <button key={a.id} type="button" className="text-left" onClick={() => tid && !a.read && void announcementService.markRead(a.id, tid)}><BoardCard title={a.title} body={a.body} category={a.category} date={when(a)} by={a.createdBy} pinned={a.pinned} unread={!a.read} /></button>)}
        </div>
      )}
      {!!(formal.data ?? []).length && (
        <GlassCard hover={false} className="space-y-3">
          <h2 className="text-h3 text-ink-900">{t.legalDesk.formal}</h2>
          {(formal.data ?? []).map((x) => <details key={x.id} className="rounded-[5.75px] border border-border-soft bg-surface-solid p-3"><summary className="flex cursor-pointer flex-wrap items-center gap-2"><span className="min-w-0 flex-1 truncate font-medium">{x.subject}</span><DeliveryChip s={x.overall} /><span className="text-[12px] text-ink-500">{formatDate(x.sentAt)}</span></summary><p className="mt-2 whitespace-pre-line text-[14px] text-ink-500">{x.body}</p></details>)}
        </GlassCard>
      )}
    </div>
  );
}
