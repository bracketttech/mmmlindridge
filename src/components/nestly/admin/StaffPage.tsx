import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, Search, UserPlus } from "lucide-react";
import { staffAdminService, inviteUrl, propertyService, type StaffView } from "@/services";
import { DEFAULT_PRESETS, isOverridden, STAFF_ROLES, toggle, togglePreset, type Overrides, type PermSet, type Scope, type StaffRole } from "@/lib/access-rules";
import { DataTable, KpiTile, Modal, NAvatar, AvatarUploader, type Column } from "@/components/nestly/composites";
import { EmptyState, GlassCard, PageHeader, PillButton, SegmentedChips, StatusChip, TruncatedText } from "@/components/nestly/primitives";
import { SidePanel, ConfirmDialog } from "@/components/nestly/overlays";
import { SelectField, ToggleRow } from "@/components/nestly/forms";
import { TextField } from "@/components/nestly/auth";
import { fill } from "@/components/nestly/properties/shared";
import { ErrorCard } from "@/components/nestly/billing/OwnerBilling";
import { copyText } from "@/components/nestly/leasing/shared";
import { avatarFor } from "@/images";
import { useData } from "@/lib/use-data";
import { formatDate, formatZAR } from "@/lib/format";
import { emailField } from "@/lib/validation";
import { t } from "@/lib/strings";
import { PermissionMatrix } from "./PermissionMatrix";

const s = t.staffAdmin;
const TONE = { active: "success", invited: "info", deactivated: "neutral" } as const;
type View = "team" | "presets";

export function StaffPage() {
  const [view, setView] = useState<View>("team");
  const data = useData(() => staffAdminService.list(), []);
  const [role, setRole] = useState<"all" | StaffRole>("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [invite, setInvite] = useState(false);
  const all = data.data ?? [];
  const rows = all.filter((m) => (role === "all" || m.role === role) && `${m.name} ${m.email}`.toLowerCase().includes(q.trim().toLowerCase()));
  const covered = new Set(all.filter((m) => m.status === "active").flatMap((m) => (m.scope === "all" ? ["all"] : m.scope)));
  const cols: Column<StaffView>[] = [
    { key: "p", header: s.cols.person, render: (m) => <div className="flex min-w-0 max-w-[260px] items-center gap-3"><NAvatar name={m.name} src={m.avatar ?? avatarFor(m.email)} /><div className="min-w-0"><TruncatedText text={m.name} className="font-medium text-ink-900" /><TruncatedText text={m.email} className="text-[12px] text-ink-500" /></div></div> },
    { key: "r", header: s.cols.role, render: (m) => t.roles[m.role] },
    { key: "s", header: s.cols.scope, render: (m) => <div className="max-w-[200px]"><TruncatedText text={m.scopeLabel} /></div> },
    { key: "l", header: s.cols.limit, render: (m) => (m.role === "caretaker" ? (m.spendLimit !== undefined ? formatZAR(m.spendLimit) : s.noLimit) : "—") },
    { key: "st", header: s.cols.status, render: (m) => <span className="flex items-center gap-2"><StatusChip tone={TONE[m.status]} dot>{s.statuses[m.status]}</StatusChip>{m.overrideCount > 0 && <StatusChip tone="warning">{m.overrideCount}</StatusChip>}</span> },
    { key: "la", header: s.cols.last, render: (m) => (m.lastActive ? formatDate(m.lastActive) : "—") },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title={s.title} muted={s.muted} sub={data.data ? fill(s.sub, { active: all.filter((m) => m.status === "active").length, invited: all.filter((m) => m.status === "invited").length }) : undefined}
        actions={<PillButton onClick={() => setInvite(true)} icon={<UserPlus className="h-4 w-4" />}>{s.invite}</PillButton>} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiTile loading={data.loading} label={s.kpi.active} value={String(all.filter((m) => m.status === "active").length)} />
        <KpiTile loading={data.loading} label={s.kpi.invited} value={String(all.filter((m) => m.status === "invited").length)} />
        <KpiTile loading={data.loading} label={s.kpi.overrides} value={String(all.filter((m) => m.overrideCount > 0).length)} />
        <KpiTile loading={data.loading} label={s.kpi.covered} value={covered.has("all") ? s.allProps : String(covered.size)} />
      </div>
      <SegmentedChips label={s.title} value={view} onChange={setView} options={[{ value: "team", label: s.views.team }, { value: "presets", label: s.views.presets }]} />
      {data.error ? <ErrorCard onRetry={data.reload} /> : view === "presets" ? <Presets /> : (
        <GlassCard hover={false} className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative block min-w-0 flex-1 sm:max-w-xs"><span className="sr-only">{s.search}</span><Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={s.search} className="h-11 w-full rounded-[5.75px] border border-input bg-surface-solid pl-9 pr-3 text-[15px] outline-none focus:border-olive-700" /></label>
            <SegmentedChips label={s.cols.role} value={role} onChange={setRole} options={[{ value: "all", label: s.all }, ...STAFF_ROLES.map((r) => ({ value: r, label: t.roles[r] }))]} />
          </div>
          <DataTable caption={s.title} rows={rows} columns={cols} loading={data.loading} selectedId={sel ?? undefined} onSelect={setSel}
            empty={<EmptyState title={s.empty} body={s.emptyBody} />}
            card={(m) => <button type="button" onClick={() => setSel(m.id)} className="flex w-full min-w-0 items-center gap-3 text-left"><NAvatar name={m.name} src={m.avatar ?? avatarFor(m.email)} /><div className="min-w-0 flex-1"><TruncatedText text={m.name} className="font-medium text-ink-900" /><TruncatedText text={`${t.roles[m.role]} · ${m.scopeLabel}`} className="text-[12px] text-ink-500" /></div><StatusChip tone={TONE[m.status]} dot>{s.statuses[m.status]}</StatusChip></button>} />
        </GlassCard>
      )}
      <StaffPanel id={sel} onClose={() => setSel(null)} />
      {invite && <InviteModal onClose={() => setInvite(false)} onDone={(id) => setSel(id)} />}
    </div>
  );
}

function useProps() { return useData(() => propertyService.list(), []).data ?? []; }

function ScopePicker({ scope, setScope }: { scope: Scope; setScope: (s: Scope) => void }) {
  const props = useProps();
  return (
    <div className="space-y-2">
      <ToggleRow label={s.panel.allToggle} checked={scope === "all"} onChange={(v) => setScope(v ? "all" : [])} />
      {scope !== "all" && props.map((p) => (
        <label key={p.id} className="flex min-w-0 items-center gap-3 rounded-[5.75px] border border-border-soft bg-surface-solid px-4 py-3 text-[14px]">
          <input type="checkbox" className="h-4 w-4 accent-olive-700" checked={scope.includes(p.id)} onChange={(e) => setScope(e.target.checked ? [...scope, p.id] : scope.filter((x) => x !== p.id))} />
          <TruncatedText text={p.name} />
        </label>
      ))}
    </div>
  );
}

function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", role: "caretaker" as StaffRole, scope: [] as Scope, limit: "2000" });
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (f.name.trim().length < 2 || !emailField.safeParse(f.email).success) { setErr(t.auth.validation.email); return; }
    if (f.scope !== "all" && !f.scope.length) { setErr(s.panel.scopeHint); return; }
    setBusy(true);
    try {
      const r = await staffAdminService.invite({ name: f.name, email: f.email, phone: f.phone, role: f.role, scope: f.scope, spendLimit: f.limit ? Number(f.limit) : undefined });
      toast.success(fill(s.form.sent, { email: f.email }), { action: { label: s.panel.copy, onClick: () => void copyText(inviteUrl(r.token)) } });
      onDone(r.id); onClose();
    } catch { setErr(s.form.duplicate); } finally { setBusy(false); }
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={s.form.title} wide
      footer={<><PillButton variant="secondary" onClick={onClose}>{t.common.cancel}</PillButton><PillButton onClick={submit} disabled={busy}>{busy ? t.common.working : s.form.send}</PillButton></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={s.panel.name} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <TextField label={s.panel.email} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <TextField label={s.panel.phone} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <SelectField label={s.panel.role} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as StaffRole })}>{STAFF_ROLES.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}</SelectField>
        </div>
        {f.role === "caretaker" && <TextField label={s.panel.limit} hint={s.panel.limitHint} inputMode="numeric" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value.replace(/\D/g, "") })} />}
        <div><p className="mb-2 text-[14px] font-medium text-ink-900">{s.panel.scopeTitle}</p><ScopePicker scope={f.scope} setScope={(sc) => setF({ ...f, scope: sc })} /></div>
        <p className="text-[12px] text-ink-500">{s.form.note}</p>
        {err && <p role="alert" className="text-[13px] text-danger">{err}</p>}
      </div>
    </Modal>
  );
}

function StaffPanel({ id, onClose }: { id: string | null; onClose: () => void }) {
  const d = useData(() => (id ? staffAdminService.get(id) : Promise.resolve(null)), [id]);
  const presets = useData(() => staffAdminService.presets(), []);
  const m = d.data;
  const [tab, setTab] = useState<"details" | "access" | "perms">("details");
  const [f, setF] = useState({ name: "", phone: "", role: "caretaker" as StaffRole });
  const [scope, setScope] = useState<Scope>("all");
  const [limit, setLimit] = useState("");
  const [confirm, setConfirm] = useState<"remove" | "deact" | null>(null);
  useEffect(() => { if (m) { setF({ name: m.name, phone: m.phone, role: m.role }); setScope(m.scope); setLimit(m.spendLimit !== undefined ? String(m.spendLimit) : ""); } }, [m?.id, m?.name, m?.role, m?.phone]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!id) return null;
  const preset = presets.data && m ? presets.data[m.role] : undefined;
  const flip = async (mod: Parameters<typeof toggle>[2], a: Parameters<typeof toggle>[3], v: boolean) => {
    if (!m || !preset) return;
    const next: Overrides = toggle(preset, m.overrides, mod, a, v);
    await staffAdminService.setOverrides(m.id, next, `${s.modules[mod]} ${s.actions[a]} ${v ? "on" : "off"}`);
  };
  return (
    <SidePanel open onOpenChange={(o) => !o && onClose()} title={m?.name ?? s.title} wide
      footer={m && <>
        {m.status === "invited" && <><PillButton size="sm" variant="secondary" onClick={async () => { await copyText(inviteUrl(m.inviteToken ?? "")); toast.success(s.panel.copied); }} icon={<Copy className="h-3.5 w-3.5" />}>{s.panel.copy}</PillButton><PillButton size="sm" variant="secondary" onClick={async () => { await staffAdminService.resendInvite(m.id); toast.success(s.panel.resent); }}>{s.panel.resend}</PillButton></>}
        {m.status === "active" && <PillButton size="sm" variant="secondary" onClick={() => setConfirm("deact")}>{s.panel.deactivate}</PillButton>}
        {m.status === "deactivated" && <PillButton size="sm" variant="secondary" onClick={async () => { await staffAdminService.setStatus(m.id, "active"); toast.success(s.panel.reactivated); }}>{s.panel.reactivate}</PillButton>}
        <PillButton size="sm" variant="danger" onClick={() => setConfirm("remove")}>{s.panel.remove}</PillButton>
      </>}>
      {!m ? <div className="h-40 animate-pulse rounded bg-olive-100" /> : (
        <div className="space-y-5">
          <div className="flex items-center gap-2"><StatusChip tone={TONE[m.status]} dot>{s.statuses[m.status]}</StatusChip><span className="text-[13px] text-ink-500">{t.roles[m.role]}</span></div>
          <SegmentedChips label={m.name} value={tab} onChange={setTab} options={[{ value: "details", label: s.panel.details }, { value: "access", label: s.panel.access }, { value: "perms", label: `${s.panel.perms}${m.overrideCount ? ` · ${m.overrideCount}` : ""}` }]} />
          {tab === "details" && (
            <div className="space-y-4">
              <div><p className="mb-2 text-[14px] font-medium">{s.panel.photo}</p><AvatarUploader key={m.id} name={m.name} initial={m.avatar ?? avatarFor(m.email) ?? null} onChange={(src) => void staffAdminService.setAvatar(m.id, src)} /></div>
              <TextField label={s.panel.name} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              <TextField label={s.panel.email} value={m.email} readOnly disabled />
              <TextField label={s.panel.phone} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
              <SelectField label={s.panel.role} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as StaffRole })}>{STAFF_ROLES.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}</SelectField>
              <PillButton onClick={async () => { await staffAdminService.update(m.id, f); toast.success(s.panel.saved); }}>{s.panel.save}</PillButton>
            </div>
          )}
          {tab === "access" && (
            <div className="space-y-4">
              <p className="text-[13px] text-ink-500">{s.panel.scopeHint}</p>
              <ScopePicker scope={scope} setScope={setScope} />
              {m.role === "caretaker" && <TextField label={s.panel.limit} hint={s.panel.limitHint} inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))} />}
              <PillButton onClick={async () => { await staffAdminService.setScope(m.id, scope); if (m.role === "caretaker") await staffAdminService.setSpendLimit(m.id, limit ? Number(limit) : undefined); toast.success(s.panel.accessSaved); }}>{s.panel.saveAccess}</PillButton>
            </div>
          )}
          {tab === "perms" && preset && (
            <div className="space-y-3">
              <p className="text-[12px] text-ink-500"><span className="mr-1 inline-block h-3 w-3 rounded-full ring-2 ring-warning" aria-hidden />{fill(s.panel.overridden, { role: t.roles[m.role] })}</p>
              <PermissionMatrix perms={m.perms} onToggle={flip} changed={(mod, a) => isOverridden(preset, m.overrides, mod, a)} />
              {m.overrideCount > 0 && <PillButton variant="secondary" size="sm" onClick={async () => { await staffAdminService.setOverrides(m.id, {}, s.panel.reset); toast.success(s.panel.resetDone); }}>{s.panel.reset}</PillButton>}
            </div>
          )}
        </div>
      )}
      {m && <ConfirmDialog open={confirm === "remove"} onOpenChange={(o) => !o && setConfirm(null)} title={fill(s.panel.removeTitle, { name: m.name })} body={s.panel.removeBody} confirmLabel={s.panel.remove}
        onConfirm={async () => { await staffAdminService.remove(m.id); toast.success(s.panel.removed); onClose(); }} />}
      {m && <ConfirmDialog open={confirm === "deact"} onOpenChange={(o) => !o && setConfirm(null)} title={fill(s.panel.deactTitle, { name: m.name })} body={s.panel.deactBody} confirmLabel={s.panel.deactivate}
        onConfirm={async () => { await staffAdminService.setStatus(m.id, "deactivated"); toast.success(s.panel.deactivated); }} />}
    </SidePanel>
  );
}

function Presets() {
  const d = useData(() => staffAdminService.presets(), []);
  const [role, setRole] = useState<StaffRole>("caretaker");
  const p: PermSet | undefined = d.data?.[role];
  return (
    <GlassCard hover={false} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedChips label={s.views.presets} value={role} onChange={setRole} options={STAFF_ROLES.map((r) => ({ value: r, label: t.roles[r] }))} />
        <PillButton variant="secondary" size="sm" onClick={async () => { await staffAdminService.resetPreset(role); toast.success(s.restored); }} icon={<Plus className="h-3.5 w-3.5 rotate-45" />}>{s.restore}</PillButton>
      </div>
      <p className="text-[13px] text-ink-500">{s.presetsHint} {s.ownerNote}</p>
      {p ? <PermissionMatrix perms={p} changed={(m, a) => DEFAULT_PRESETS[role][m][a] !== p[m][a]}
        onToggle={(m, a, v) => void staffAdminService.setPreset(role, togglePreset(p, m, a, v), `${s.modules[m]} ${s.actions[a]} ${v ? "on" : "off"}`)} /> : <div className="h-64 animate-pulse rounded bg-olive-100" />}
    </GlassCard>
  );
}
