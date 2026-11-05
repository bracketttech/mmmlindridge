import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Check, Inbox, Mail, X } from "lucide-react";
import { Placeholder } from "@/components/nestly/Placeholder";
import { EmptyState, GlassCard, PageHeader, PillButton, SegmentedChips, Skel, StatusChip, Timeline, TruncatedText } from "@/components/nestly/primitives";
import { Modal, NAvatar } from "@/components/nestly/composites";
import { SidePanel } from "@/components/nestly/overlays";
import { TextAreaField } from "@/components/nestly/forms";
import { Logo } from "@/components/nestly/logo";
import { historyLabel } from "@/components/nestly/tenants/ProfileRail";
import { useMediaQuery, useUnitDirectory } from "@/components/nestly/tenants/shared";
import { fill } from "@/components/nestly/properties/shared";
import { changeService, tenantService, type ChangeRequest, type Tenant } from "@/services";
import { useAppState } from "@/lib/app-state";
import { roleCanSee } from "@/lib/nav";
import { useData } from "@/lib/use-data";
import { formatDate } from "@/lib/format";
import { isValidRejectReason } from "@/lib/tenancy-rules";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

const STATUSES = ["all", "pending", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];
type Search = { status?: Exclude<Status, "all"> | undefined; id?: string | undefined };

export const Route = createFileRoute("/_shell/change-requests")({
  head: () => pageHead("Change requests", "Approve or reject tenants' requests to change their details."),
  validateSearch: (s: Record<string, unknown>): Search => ({
    status: STATUSES.includes(s["status"] as Status) && s["status"] !== "all" ? (s["status"] as Exclude<Status, "all">) : undefined,
    id: typeof s["id"] === "string" && s["id"] ? s["id"] : undefined,
  }),
  component: ChangeRequestsPage,
});

const tone = { pending: "warning", approved: "success", rejected: "danger" } as const;

function ChangeRequestsPage() {
  const { role } = useAppState();
  const c = t.changes;
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/change-requests" });
  const set = (p: Partial<Search>, replace = true) => navigate({ search: (s: Search) => ({ ...s, ...p }), replace });
  const reqs = useData(() => changeService.list(), []);
  const tenants = useData(() => tenantService.list("all", { archived: true }), []);
  const dir = useUnitDirectory();
  const wide = useMediaQuery("(min-width: 1024px)");
  const byId = useMemo(() => new Map((tenants.data ?? []).map((x) => [x.id, x])), [tenants.data]);
  const all = (reqs.data ?? []).filter((r) => byId.has(r.tenantId));
  const rows = all.filter((r) => !search.status || r.status === search.status);
  const sel = all.find((r) => r.id === search.id) ?? null;
  const loading = reqs.loading || tenants.loading;

  if (!roleCanSee(role, "change-requests")) return <Placeholder navKey="change-requests" title={c.title} muted={c.muted} />;
  const pending = all.filter((r) => r.status === "pending").length;
  const detail = sel && <RequestDetail r={sel} x={byId.get(sel.tenantId)!} place={dir.place(byId.get(sel.tenantId)!)} />;

  return (
    <div className="space-y-6">
      <PageHeader title={c.title} muted={c.muted} sub={loading ? undefined : fill(c.sub, { n: pending })} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <GlassCard hover={false} className="min-w-0 space-y-3 p-3 md:p-4">
          <SegmentedChips label={c.title} value={search.status ?? "all"} onChange={(v) => set({ status: v === "all" ? undefined : v })} wrap
            options={STATUSES.map((s) => ({ value: s, label: c.statuses[s], count: loading ? undefined : s === "all" ? all.length : all.filter((r) => r.status === s).length }))} />
          {reqs.error || tenants.error ? <EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={reqs.reload}>{t.common.retry}</PillButton>} />
            : loading ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skel key={i} className="h-20 w-full" />)}</div>
            : rows.length === 0 ? <EmptyState icon={<Inbox className="h-6 w-6" />} title={c.emptyTitle} body={c.emptyBody} />
            : (
              <ul className="space-y-2">
                {rows.map((r) => {
                  const x = byId.get(r.tenantId)!;
                  return (
                    <li key={r.id}>
                      <button type="button" onClick={() => set({ id: r.id }, false)} aria-current={r.id === sel?.id ? "true" : undefined}
                        className={cn("flex w-full min-w-0 items-center gap-3 rounded-[5px] border border-border-soft p-3 text-left transition-colors", r.id === sel?.id ? "bg-olive-100" : "bg-surface-solid/80 hover:bg-surface-solid")}>
                        <NAvatar name={x.name} src={x.avatar} size={40} />
                        <div className="min-w-0 flex-1">
                          <TruncatedText text={x.name} className="font-medium text-ink-900" />
                          <TruncatedText text={`${dir.place(x)} · ${r.changes.map((f) => c.fields[f.field]).join(", ")}`} className="text-[12px] text-ink-500" />
                        </div>
                        <div className="shrink-0 text-right"><StatusChip tone={tone[r.status]} dot>{c.statuses[r.status]}</StatusChip><p className="mt-1 text-[12px] text-ink-500">{formatDate(r.submittedAt)}</p></div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
        </GlassCard>
        {wide && <GlassCard hover={false} className="hidden min-w-0 self-start p-5 lg:block">{detail || <EmptyState icon={<Inbox className="h-6 w-6" />} body={c.select} />}</GlassCard>}
      </div>
      {!wide && <SidePanel open={!!sel} onOpenChange={(o) => !o && set({ id: undefined })} title={sel ? byId.get(sel.tenantId)?.name ?? "" : ""} wide>{detail}</SidePanel>}
    </div>
  );
}

function RequestDetail({ r, x, place }: { r: ChangeRequest; x: Tenant; place: string }) {
  const c = t.changes;
  const [rejecting, setRejecting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const hist = useData(() => tenantService.history(x.id), [x.id, r.status]);
  const approve = async () => {
    setBusy(true);
    try { await changeService.approve(r.id); toast.success(c.approved); } catch { toast.error(t.common.errorBody); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <NAvatar name={x.name} src={x.avatar} size={52} />
        <div className="min-w-0 flex-1">
          <h2 className="min-w-0"><TruncatedText text={x.name} className="text-h2 text-ink-900" /></h2>
          <TruncatedText text={place} className="text-[13px] text-ink-500" />
          <p className="mt-1 text-[12px] text-ink-500">{r.status === "pending" ? fill(c.submitted, { date: formatDate(r.submittedAt) }) : fill(c.decided, { status: c.statuses[r.status], date: formatDate(r.decidedAt ?? r.submittedAt), by: r.decidedBy ?? "" })}</p>
        </div>
        <StatusChip tone={tone[r.status]} dot>{c.statuses[r.status]}</StatusChip>
      </div>

      <div>
        <p className="mb-2 text-overline text-ink-500">{fill(c.fieldsChanged, { n: r.changes.length })}</p>
        <div className="overflow-hidden rounded-[5px] border border-border-soft">
          <div className="hidden grid-cols-[1fr_1fr_1fr] gap-3 bg-surface-solid/70 px-3 py-2 text-overline text-ink-500 sm:grid"><span /><span>{c.old}</span><span>{c.new}</span></div>
          {r.changes.map((f) => (
            <div key={f.field} className="grid gap-1 border-t border-border-soft px-3 py-3 first:border-t-0 sm:grid-cols-[1fr_1fr_1fr] sm:gap-3 sm:first:border-t">
              <span className="text-[13px] font-medium text-ink-900">{c.fields[f.field]}</span>
              <span className="min-w-0 text-[13px] text-ink-500 line-through decoration-danger/60"><span className="sr-only">{c.old}: </span><TruncatedText text={f.from || "—"} /></span>
              <span className="min-w-0 rounded-[3px] bg-success/10 px-1.5 text-[13px] font-medium text-ink-900"><span className="sr-only">{c.new}: </span><TruncatedText text={f.to || "—"} /></span>
            </div>
          ))}
        </div>
      </div>

      {r.status === "rejected" && r.reason && <p className="rounded-[5px] border border-danger/25 bg-danger/10 px-3 py-2.5 text-[13px] text-danger">{r.reason}</p>}

      <div className="flex flex-wrap gap-2">
        {r.status === "pending" && <>
          <PillButton onClick={approve} disabled={busy} icon={<Check className="h-4 w-4" />}>{c.approve}</PillButton>
          <PillButton variant="secondary" onClick={() => setRejecting(true)} icon={<X className="h-4 w-4" />}>{c.reject}</PillButton>
        </>}
        <PillButton variant="ghost" onClick={() => setEmailOpen(true)} icon={<Mail className="h-4 w-4" />}>{c.email}</PillButton>
        <Link to="/tenants" search={{ t: x.id }} className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium text-olive-700 hover:bg-olive-100">{c.openTenant}<ArrowRight className="h-4 w-4" /></Link>
      </div>

      <section className="space-y-3 border-t border-border-soft pt-4">
        <h3 className="text-overline text-ink-500">{c.history}</h3>
        {hist.loading ? <Skel className="h-16 w-full" /> : <Timeline items={(hist.data ?? []).slice(0, 8).map((h) => ({ title: historyLabel(h.kind, h.note), meta: `${formatDate(h.at)} · ${h.by}`, tone: h.kind === "change_rejected" ? "danger" : h.kind === "change_approved" ? "success" : "neutral" }))} />}
      </section>

      {rejecting && <RejectModal r={r} name={x.name} onClose={() => setRejecting(false)} />}
      <Modal open={emailOpen} onOpenChange={setEmailOpen} title={c.emailTitle} wide><ChangeEmail r={r} x={x} place={place} /></Modal>
    </div>
  );
}

function RejectModal({ r, name, onClose }: { r: ChangeRequest; name: string; onClose: () => void }) {
  const c = t.changes;
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const ok = isValidRejectReason(reason);
  const go = async () => {
    setTouched(true);
    if (!ok) return;
    setBusy(true);
    try { await changeService.reject(r.id, reason); toast.success(c.rejected); onClose(); } catch { toast.error(t.common.errorBody); } finally { setBusy(false); }
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={c.rejectTitle}
      footer={<><PillButton variant="secondary" onClick={onClose}>{t.common.cancel}</PillButton><PillButton onClick={go} disabled={busy} className="bg-danger hover:bg-danger/90">{c.reject}</PillButton></>}>
      <p className="mb-4 text-[14px] text-ink-700">{fill(c.rejectBody, { name: name.split(" ")[0] ?? name })}</p>
      <TextAreaField label={c.reason} placeholder={c.reasonPh} value={reason} maxLength={300} autoFocus onChange={(e) => setReason(e.target.value)} onBlur={() => setTouched(true)} error={touched && !ok ? c.reasonShort : undefined} />
    </Modal>
  );
}

/** "Request for change of details" email the owner receives. */
function ChangeEmail({ r, x, place }: { r: ChangeRequest; x: Tenant; place: string }) {
  const c = t.changes;
  const [property, unit] = place.split(" · ");
  return (
    <div className="space-y-3">
      <dl className="space-y-1 text-[13px]">
        <div className="flex gap-2"><dt className="w-16 shrink-0 text-ink-500">From</dt><dd className="truncate text-ink-900">Nestly &lt;notifications@nestly.co.za&gt;</dd></div>
        <div className="flex gap-2"><dt className="w-16 shrink-0 text-ink-500">To</dt><dd className="truncate text-ink-900">Janice Tinto &lt;janice@tintoproperty.co.za&gt;</dd></div>
        <div className="flex gap-2"><dt className="w-16 shrink-0 text-ink-500">Subject</dt><dd className="min-w-0 truncate font-medium text-ink-900">{fill(c.emailSubject, { name: x.name, unit: unit ?? "" })}</dd></div>
      </dl>
      <div className="rounded-[5px] border border-border-soft bg-olive-100/50 p-3 sm:p-6">
        <div className="mx-auto max-w-[520px] space-y-4 rounded-[5px] bg-surface-solid p-5 sm:p-7">
          <Logo />
          <p className="text-[15px] text-ink-900">{fill(c.emailIntro, { name: x.name, property: property ?? "", unit: unit ?? "" })}</p>
          <table className="w-full border-collapse text-left text-[13px]">
            <thead><tr className="text-ink-500"><th className="border-b border-border-soft py-2 pr-2 font-medium" /><th className="border-b border-border-soft py-2 pr-2 font-medium">{c.old}</th><th className="border-b border-border-soft py-2 font-medium">{c.new}</th></tr></thead>
            <tbody>{r.changes.map((f) => (
              <tr key={f.field}><td className="border-b border-border-soft py-2 pr-2 font-medium text-ink-900">{c.fields[f.field]}</td><td className="break-all border-b border-border-soft py-2 pr-2 text-ink-500">{f.from || "—"}</td><td className="break-all border-b border-border-soft py-2 font-medium text-ink-900">{f.to || "—"}</td></tr>
            ))}</tbody>
          </table>
          <span className="inline-flex h-11 items-center rounded-full bg-olive-700 px-5 text-[14px] font-medium text-primary-foreground">{c.emailCta}</span>
          <p className="text-[12px] text-ink-500">{c.emailFooter}</p>
        </div>
      </div>
    </div>
  );
}
