import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, ImagePlus, Search, Trash2 } from "lucide-react";
import { auditService, settingsService, subscriptionService, profileService, NOTIF_CHANNELS, NOTIF_EVENTS, type AuditRow, type Company, type NotifPrefs } from "@/services";
import type { Plan } from "@/mocks/plans";
import { canMoveTo, isOverLimit, quote, usagePct, type Cycle } from "@/lib/subscription-rules";
import { AvatarUploader, DataTable, Modal, NAvatar, type Column } from "@/components/nestly/composites";
import { EmptyState, GlassCard, PageHeader, PillButton, ProgressBar, SegmentedChips, Skel, StatusChip, Timeline, TruncatedText } from "@/components/nestly/primitives";
import { SelectField, ToggleRow } from "@/components/nestly/forms";
import { TextField } from "@/components/nestly/auth";
import { fill } from "@/components/nestly/properties/shared";
import { ErrorCard } from "@/components/nestly/billing/OwnerBilling";
import { downloadCsv } from "@/components/nestly/billing/shared";
import { avatarFor } from "@/images";
import { useAppState } from "@/lib/app-state";
import { useData } from "@/lib/use-data";
import { readSession } from "@/lib/session";
import { formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

const s = t.set;
export const SETTINGS_VIEWS = ["profile", "notifications", "company", "billing", "audit"] as const;
export type SettingsView = (typeof SETTINGS_VIEWS)[number];

export function SettingsPage({ view, setView }: { view: SettingsView; setView: (v: SettingsView) => void }) {
  const { role } = useAppState();
  const session = readSession();
  const views = SETTINGS_VIEWS.filter((v) => role === "owner" || v === "profile" || v === "notifications");
  const v = views.includes(view) ? view : "profile";
  return (
    <div className="space-y-6">
      <PageHeader title={s.title} muted={s.muted} sub={fill(s.sub, { role: t.roles[role], email: session?.email ?? "" })} />
      <SegmentedChips label={s.title} value={v} onChange={setView} options={views.map((x) => ({ value: x, label: s.views[x] }))} />
      {v === "profile" ? <Profile /> : v === "notifications" ? <Notifications /> : v === "company" ? <CompanyForm /> : v === "billing" ? <Billing /> : <Audit />}
    </div>
  );
}

function Profile() {
  const session = readSession();
  const email = session?.email ?? "janice@nestly.co.za";
  const d = useData(() => settingsService.profile(email), [email]);
  const av = useData(() => profileService.avatar(email), [email]);
  const [f, setF] = useState({ name: session?.name ?? "", phone: "", twoFactor: false });
  useEffect(() => { if (d.data) setF({ name: d.data.name ?? session?.name ?? "", phone: d.data.phone ?? "", twoFactor: d.data.twoFactor }); }, [d.data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (d.loading) return <Skel className="h-72 max-w-2xl" />;
  return (
    <GlassCard hover={false} className="max-w-2xl space-y-4">
      {!av.loading && <AvatarUploader name={f.name || email} initial={av.data ?? avatarFor(email) ?? null} onChange={(src) => void profileService.setAvatar(email, src)} />}
      <div className="grid gap-3 sm:grid-cols-2"><TextField label={s.profile.name} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><TextField label={s.profile.phone} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      <ToggleRow label={s.profile.twoFactor} hint={s.profile.twoFactorHint} checked={f.twoFactor} onChange={(v) => setF({ ...f, twoFactor: v })} />
      <div className="flex flex-wrap gap-2"><PillButton onClick={async () => { await settingsService.saveProfile(f, email); toast.success(s.profile.saved); }}>{s.profile.save}</PillButton><PillButton variant="secondary" onClick={() => toast.success(s.profile.passwordSent)}>{s.profile.password}</PillButton></div>
    </GlassCard>
  );
}

function Notifications() {
  const d = useData(() => settingsService.prefs(), []);
  const [p, setP] = useState<NotifPrefs | null>(null);
  useEffect(() => { if (d.data) setP(d.data); }, [d.data]);
  if (d.error) return <ErrorCard onRetry={d.reload} />;
  if (!p) return <Skel className="h-96 w-full" />;
  return (
    <GlassCard hover={false} className="space-y-4">
      <div><h2 className="text-h3">{s.notif.title}</h2><p className="text-[13px] text-ink-500">{s.notif.hint}</p></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[14px]">
          <thead><tr><th className="text-overline py-2 text-ink-500">{s.notif.event}</th>{NOTIF_CHANNELS.map((c) => <th key={c} className="text-overline px-2 py-2 text-center text-ink-500">{t.ann.channels[c]}</th>)}</tr></thead>
          <tbody>{NOTIF_EVENTS.map((e) => <tr key={e} className="border-t border-border-soft"><th scope="row" className="py-2 pr-3 font-normal">{s.notif.events[e]}</th>{NOTIF_CHANNELS.map((c) => <td key={c} className="px-2 text-center"><input type="checkbox" aria-label={`${s.notif.events[e]} · ${t.ann.channels[c]}`} className="h-4 w-4 accent-olive-700" checked={p[e][c]} onChange={(x) => setP({ ...p, [e]: { ...p[e], [c]: x.target.checked } })} /></td>)}</tr>)}</tbody>
        </table>
      </div>
      <PillButton onClick={async () => { await settingsService.savePrefs(p); toast.success(s.notif.saved); }}>{s.notif.save}</PillButton>
    </GlassCard>
  );
}

function CompanyForm() {
  const d = useData(() => settingsService.company(), []);
  const [c, setC] = useState<Company | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (d.data) setC(d.data); }, [d.data]);
  if (d.error) return <ErrorCard onRetry={d.reload} />;
  if (!c) return <Skel className="h-96 w-full" />;
  const F = (k: keyof Company) => <TextField label={s.company[k as keyof typeof s.company] as string} value={(c[k] as string) ?? ""} onChange={(e) => setC({ ...c, [k]: e.target.value })} />;
  const pick = (f?: File) => {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)) { toast.error(s.company.logoType); return; }
    if (f.size > 2 * 1024 * 1024) { toast.error(s.company.logoSize); return; }
    const r = new FileReader(); r.onload = () => setC({ ...c, logo: String(r.result) }); r.readAsDataURL(f);
  };
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <GlassCard hover={false} className="space-y-4 lg:col-span-7">
        <h2 className="text-h3">{s.company.title}</h2>
        <div className="grid gap-3 sm:grid-cols-2">{F("name")}{F("tradingAs")}{F("regNo")}{F("vatNo")}{F("email")}{F("phone")}</div>{F("address")}
        <h3 className="pt-2 text-[14px] font-medium">{s.company.banking}</h3>
        <div className="grid gap-3 sm:grid-cols-3">{F("bank")}{F("accountNo")}{F("branch")}</div>{F("footer")}
        <PillButton onClick={async () => { if (!c.name.trim() || !c.email.includes("@")) { toast.error(s.company.required); return; } await settingsService.saveCompany(c); toast.success(s.company.saved); }}>{s.company.save}</PillButton>
      </GlassCard>
      <GlassCard hover={false} className="space-y-4 lg:col-span-5">
        <h2 className="text-h3">{s.company.brand}</h2>
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-[5.75px] border border-border-soft bg-surface-solid">{c.logo ? <img src={c.logo} alt={s.company.logo} className="max-h-full max-w-full object-contain" /> : <ImagePlus className="h-6 w-6 text-ink-500" />}</div>
          <div className="space-y-2"><PillButton size="sm" onClick={() => input.current?.click()}>{s.company.upload}</PillButton>{c.logo && <PillButton size="sm" variant="secondary" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setC({ ...c, logo: undefined })}>{s.company.remove}</PillButton>}</div>
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" aria-label={s.company.upload} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <p className="text-[12px] text-ink-500">{s.company.logoHint}</p>
        <p className="text-[13px] font-medium">{s.company.preview}</p>
        <div className="rounded-[5.75px] border border-border-soft bg-surface-solid p-4">
          <div className="flex items-start justify-between gap-3 border-b border-border-soft pb-3">
            {c.logo ? <img src={c.logo} alt="" className="h-10 max-w-[120px] object-contain" /> : <span className="text-h3">{c.tradingAs}</span>}
            <div className="min-w-0 text-right text-[11px] text-ink-500"><TruncatedText text={c.name} className="font-medium text-ink-900" /><p>{c.address}</p><p>VAT {c.vatNo}</p></div>
          </div>
          <p className="pt-3 text-[11px] text-ink-500">{c.bank} · {c.accountNo} · {c.branch}</p><p className="text-[11px] text-ink-500">{c.footer}</p>
        </div>
      </GlassCard>
    </div>
  );
}

const u = t.sub;
function Billing() {
  const d = useData(() => subscriptionService.get(), []);
  const [calc, setCalc] = useState<{ id: string; name: string; tenants: number }[] | null>(null);
  const [dlg, setDlg] = useState<string | null>(null);
  useEffect(() => { if (d.data && !calc) setCalc(d.data.rows); }, [d.data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (d.error) return <ErrorCard onRetry={d.reload} />;
  if (!d.data || !calc) return <Skel className="h-96 w-full" />;
  const { sub, plans, quote: q } = d.data;
  const cq = quote(calc, plans);
  const cyc = sub.cycle;
  const price = (n: number) => (cyc === "annual" ? Math.round(((n * 10) / 12) * 100) / 100 : n);
  const line = q.lines.find((l) => l.id === dlg);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-12">
        <GlassCard hover={false} className="space-y-3 lg:col-span-5">
          <p className="text-overline text-ink-500">{u.plan}</p>
          <p className="text-kpi">{formatZAR(cyc === "annual" ? q.perMonthAnnual : q.monthly)} <span className="text-[13px] text-ink-500">{u.perMonth}</span></p>
          <p className="text-[13px] text-ink-500">{u.perProperty}</p>
          <SegmentedChips label={u.plan} value={cyc} onChange={async (v: Cycle) => { await subscriptionService.setCycle(v); d.reload(); }} options={[{ value: "monthly" as Cycle, label: u.monthly }, { value: "annual" as Cycle, label: u.annual }]} />
          <p className="text-[13px] text-ink-500">{fill(u.next, { date: formatDate(sub.nextBilling) })} · {fill(u.card, { card: sub.card })}</p>
          {cyc === "annual" && <p className="text-[13px]">{u.annualTotal}: {formatZAR(q.annual)}</p>}
          <p className="text-[11px] text-ink-500">{u.excl}</p>
        </GlassCard>
        <GlassCard hover={false} className="space-y-3 lg:col-span-7">
          <h2 className="text-h3">{u.usage}</h2>
          {q.lines.map((l) => {
            const over = isOverLimit(l.tenants, l.plan);
            return (
              <div key={l.id} className="flex flex-wrap items-center gap-3 border-b border-border-soft pb-3 last:border-0">
                <div className="min-w-0 flex-1 basis-48"><TruncatedText text={l.name} className="font-medium" />
                  <ProgressBar value={usagePct(l.tenants, l.plan)} tone={over ? "danger" : usagePct(l.tenants, l.plan) > 85 ? "warning" : "olive"} label={`${fill(u.tenants, { n: l.tenants })} ${l.plan.maxTenants ? fill(u.limit, { n: l.plan.maxTenants }) : u.unlimited} · ${l.plan.name}`} />
                  {over && <p className="text-[12px] text-danger">{fill(u.over, { plan: l.plan.name })}</p>}</div>
                <span className="tabular-nums">{l.monthly !== null ? formatZAR(price(l.monthly)) : u.talk}</span>
                <PillButton size="sm" variant="secondary" onClick={() => setDlg(l.id)}>{u.change}</PillButton>
              </div>
            );
          })}
        </GlassCard>
      </div>
      <GlassCard hover={false} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-h3">{u.calc}</h2><p className="text-[13px] text-ink-500">{u.calcHint}</p></div><PillButton size="sm" variant="ghost" onClick={() => setCalc(d.data!.rows)}>{u.reset}</PillButton></div>
        {cq.lines.map((l, i) => (
          <div key={l.id} className="grid grid-cols-[minmax(0,1fr)_96px_auto] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_120px_120px_120px]">
            <TruncatedText text={l.name} />
            <input type="number" min={0} max={500} aria-label={`${l.name} tenants`} value={l.tenants} onChange={(e) => setCalc(calc.map((x, j) => (j === i ? { ...x, tenants: Math.max(0, Math.min(500, Number(e.target.value) || 0)) } : x)))} className="h-10 w-full rounded-[5.75px] border border-input bg-surface-solid px-3 text-right tabular-nums" />
            <StatusChip tone="info">{l.plan.name}</StatusChip>
            <span className="hidden text-right tabular-nums sm:block">{l.monthly !== null ? formatZAR(price(l.monthly)) : u.talk}</span>
          </div>
        ))}
        <PillButton size="sm" variant="secondary" onClick={() => setCalc([...calc, { id: `new-${calc.length}`, name: fill(u.newProp, { n: calc.length + 1 }), tenants: 10 }])}>{u.addProp}</PillButton>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border-soft pt-3">
          <span className="font-medium">{u.total}{cq.custom > 0 && <span className="ml-2 text-[12px] text-ink-500">{fill(u.custom, { n: cq.custom })}</span>}</span>
          <span className="text-h2 tabular-nums" aria-live="polite">{formatZAR(cyc === "annual" ? cq.perMonthAnnual : cq.monthly)} <span className="text-[13px] text-ink-500">{u.perMonth}</span></span>
        </div>
        <div className="grid gap-2 pt-2 sm:grid-cols-4">{plans.map((p) => <div key={p.id} className="rounded-[5.75px] border border-border-soft bg-surface-solid p-3"><p className="font-medium">{p.name}</p><p className="text-[12px] text-ink-500">{p.maxTenants ? fill(u.upTo, { n: p.maxTenants }) : t.onboarding.plan.custom}</p><p className="mt-1 tabular-nums">{p.monthly !== null ? `${formatZAR(price(p.monthly))} ${u.perMonth}` : u.talk}</p></div>)}</div>
      </GlassCard>
      <GlassCard hover={false} className="space-y-3">
        <h2 className="text-h3">{u.invoices}</h2>
        <ul className="divide-y divide-border-soft">{sub.invoices.map((i) => <li key={i.id} className="flex flex-wrap items-center gap-3 py-2"><span className="min-w-0 flex-1">{i.number} · {i.period}</span><span className="tabular-nums">{formatZAR(i.amount)}</span><StatusChip tone={i.status === "paid" ? "success" : "warning"} dot>{i.status === "paid" ? u.paid : u.due}</StatusChip><button aria-label={`${u.download} ${i.number}`} onClick={() => toast(u.downloaded)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-olive-100"><Download className="h-4 w-4" /></button></li>)}</ul>
      </GlassCard>
      {line && <TierDialog line={line} plans={plans} nextBilling={sub.nextBilling} price={price} onClose={() => setDlg(null)} onDone={() => d.reload()} />}
    </div>
  );
}

function TierDialog({ line, plans, nextBilling, price, onClose, onDone }: { line: { id: string; name: string; tenants: number; plan: Plan; monthly: number | null }; plans: Plan[]; nextBilling: string; price: (n: number) => number; onClose: () => void; onDone: () => void }) {
  const [pick, setPick] = useState<Plan["id"] | "auto">(line.plan.id);
  const target = plans.find((p) => p.id === pick);
  const blocked = target && !canMoveTo(line.tenants, target);
  const delta = target && target.monthly !== null && line.monthly !== null ? price(target.monthly) - price(line.monthly) : null;
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={fill(u.dlg.title, { name: line.name })}
      footer={<><PillButton variant="secondary" onClick={onClose}>{t.common.cancel}</PillButton><PillButton disabled={!!blocked} onClick={async () => { await subscriptionService.setTier(line.id, pick === "auto" ? null : pick); toast.success(u.dlg.done); onDone(); onClose(); }}>{u.dlg.confirm}</PillButton></>}>
      <div className="space-y-3">
        <p className="text-[13px] text-ink-500">{fill(u.dlg.current, { plan: line.plan.name })} · {fill(u.tenants, { n: line.tenants })}</p>
        <SelectField label={u.change} value={pick} onChange={(e) => setPick(e.target.value as Plan["id"] | "auto")}>
          <option value="auto">{u.dlg.auto}</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.maxTenants ? fill(u.upTo, { n: p.maxTenants }) : u.talk}</option>)}
        </SelectField>
        {blocked && <p role="alert" className="text-[13px] text-danger">{fill(u.dlg.blocked, { name: line.name, n: line.tenants, plan: target!.name })}</p>}
        {!blocked && delta !== null && delta !== 0 && <p className={cn("text-[14px] font-medium", delta > 0 ? "text-ink-900" : "text-olive-700")}>{delta > 0 ? u.dlg.up : u.dlg.down}: {fill(u.dlg.delta, { delta: `${delta > 0 ? "+" : "−"}${formatZAR(Math.abs(delta))}` })}</p>}
        <p className="text-[12px] text-ink-500">{fill(u.dlg.note, { date: formatDate(nextBilling) })}</p>
      </div>
    </Modal>
  );
}

const a = t.audit;
function Audit() {
  const d = useData(() => auditService.list(), []);
  const [q, setQ] = useState("");
  const [area, setArea] = useState<"all" | AuditRow["area"]>("all");
  const rows = (d.data ?? []).filter((x) => (area === "all" || x.area === area) && `${x.actor} ${x.action} ${x.target}`.toLowerCase().includes(q.trim().toLowerCase()));
  const when = (x: AuditRow) => `${formatDate(x.at)} ${x.at.slice(11, 16)}`;
  const cols: Column<AuditRow>[] = [
    { key: "w", header: a.cols.when, render: when },
    { key: "p", header: a.cols.who, render: (x) => <div className="flex min-w-0 max-w-[200px] items-center gap-2"><NAvatar name={x.actor} size={28} /><div className="min-w-0"><TruncatedText text={x.actor} className="text-[13px] font-medium" /><TruncatedText text={x.role} className="text-[11px] text-ink-500" /></div></div> },
    { key: "a", header: a.cols.action, render: (x) => x.action },
    { key: "t", header: a.cols.target, render: (x) => <div className="max-w-[240px]"><TruncatedText text={x.target} /></div> },
    { key: "f", header: a.cols.where, render: (x) => <div className="max-w-[180px] text-[12px] text-ink-500"><TruncatedText text={`${x.ip} · ${x.device}`} /></div> },
  ];
  if (d.error) return <ErrorCard onRetry={d.reload} />;
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <GlassCard hover={false} className="space-y-3 xl:col-span-8">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block min-w-0 flex-1 sm:max-w-xs"><span className="sr-only">{a.search}</span><Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={a.search} className="h-11 w-full rounded-[5.75px] border border-input bg-surface-solid pl-9 pr-3 text-[15px] outline-none focus:border-olive-700" /></label>
          <select aria-label={a.all} value={area} onChange={(e) => setArea(e.target.value as typeof area)} className="h-11 rounded-[5.75px] border border-input bg-surface-solid px-3 text-[14px]"><option value="all">{a.all}</option>{(Object.keys(a.areas) as AuditRow["area"][]).map((k) => <option key={k} value={k}>{a.areas[k]}</option>)}</select>
          <PillButton size="sm" variant="secondary" icon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadCsv("audit-log.csv", [["When", "Who", "Role", "Action", "Record", "IP", "Device"], ...rows.map((x) => [x.at, x.actor, x.role, x.action, x.target, x.ip, x.device])])}>{a.export}</PillButton>
        </div>
        <DataTable caption={a.title} rows={rows} columns={cols} loading={d.loading} empty={<EmptyState title={a.empty} />}
          card={(x) => <div className="min-w-0"><TruncatedText text={`${x.actor} · ${x.action}`} className="font-medium" /><TruncatedText text={x.target} className="text-[12px] text-ink-500" /><p className="text-[11px] text-ink-500">{when(x)} · {x.ip}</p></div>} />
      </GlassCard>
      <GlassCard hover={false} className="xl:col-span-4">
        <h2 className="mb-3 text-h3">{a.feed}</h2>
        {d.loading ? <Skel className="h-64 w-full" /> : <Timeline items={(d.data ?? []).slice(0, 10).map((x) => ({ title: `${x.actor} — ${x.action.toLowerCase()}`, meta: `${x.target} · ${when(x)}` }))} />}
      </GlassCard>
    </div>
  );
}
