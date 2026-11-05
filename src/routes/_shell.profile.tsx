import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Clock, Lock, Pencil, Send, XCircle } from "lucide-react";
import { TextField } from "@/components/nestly/auth";
import { AvatarUploader } from "@/components/nestly/composites";
import { ConfirmDialog } from "@/components/nestly/overlays";
import { EmptyState, GlassCard, PageHeader, PillButton, Skel, StatusChip, Timeline, TruncatedText } from "@/components/nestly/primitives";
import { historyLabel } from "@/components/nestly/tenants/ProfileRail";
import { useUnitDirectory } from "@/components/nestly/tenants/shared";
import { fill } from "@/components/nestly/properties/shared";
import { changeService, detailValues, profileService, tenantService, type Tenant } from "@/services";
import { useAppState } from "@/lib/app-state";
import { readSession } from "@/lib/session";
import { useData } from "@/lib/use-data";
import { detailsSchema } from "@/lib/validation";
import { diffDetails } from "@/lib/tenancy-rules";
import { formatDate, formatZAR } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";
import type { DetailValues } from "@/mocks/tenancy";

export const Route = createFileRoute("/_shell/profile")({
  head: () => pageHead("Profile", "Your photo and details in Nestly."),
  component: ProfilePage,
});

function ProfilePage() {
  const { role } = useAppState();
  return role === "tenant" ? <MyDetails /> : <StaffProfile />;
}

function StaffProfile() {
  const sp = t.staffProfile;
  const { role } = useAppState();
  const session = readSession();
  const email = session?.email ?? "janice@tintoproperty.co.za";
  const name = session?.name ?? "Janice Tinto";
  const { data, loading } = useData(() => profileService.avatar(email), [email]);
  return (
    <div className="space-y-6">
      <PageHeader title={sp.title} muted={sp.muted} sub={fill(sp.sub, { role: t.roles[role], email })} />
      <GlassCard hover={false} className="max-w-2xl space-y-5 p-5 md:p-6">
        <div><h2 className="text-h3 text-ink-900">{sp.photo}</h2><p className="text-[13px] text-ink-500">{sp.photoHint}</p></div>
        {loading ? <Skel className="h-[72px] w-64" /> : <AvatarUploader key={email} name={name} initial={data} onChange={(src) => void profileService.setAvatar(email, src)} />}
        <dl className="grid gap-3 border-t border-border-soft pt-4 sm:grid-cols-2">
          <div className="min-w-0"><dt className="text-[12px] text-ink-500">{sp.name}</dt><dd className="text-[14px] font-medium text-ink-900"><TruncatedText text={name} /></dd></div>
          <div className="min-w-0"><dt className="text-[12px] text-ink-500">{sp.email}</dt><dd className="text-[14px] font-medium text-ink-900"><TruncatedText text={email} /></dd></div>
        </dl>
      </GlassCard>
    </div>
  );
}

function MyDetails() {
  const m = t.me;
  const email = readSession()?.email;
  const { data: me, loading, error, reload } = useData(() => tenantService.me(email), [email]);
  const dir = useUnitDirectory();
  if (loading) return <div className="space-y-6"><Skel className="h-12 w-72" /><Skel className="h-80 rounded-[7px]" /></div>;
  if (error || !me) return <GlassCard hover={false}><EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={reload}>{t.common.retry}</PillButton>} /></GlassCard>;
  return <MyDetailsView key={me.id} me={me} property={dir.propertyName(me.propertyId)} unit={dir.unitLabel(me.unitId)} />;
}

function MyDetailsView({ me, property, unit }: { me: Tenant; property: string; unit: string }) {
  const m = t.me;
  const f = t.changes.fields;
  const changes = useData(() => changeService.forTenant(me.id), [me.id]);
  const hist = useData(() => tenantService.history(me.id), [me.id]);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<ReturnType<typeof diffDetails> | null>(null);
  const current = detailValues(me);
  const latest = changes.data?.[0];
  const pending = latest?.status === "pending" ? latest : undefined;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<DetailValues>({ resolver: zodResolver(detailsSchema), defaultValues: current, mode: "onTouched" });

  const onSubmit = handleSubmit((v) => {
    const d = diffDetails(current, v);
    if (!d.length) { toast.error(m.noChange); return; }
    setConfirm(d);
  });

  const rows: [keyof typeof f, string][] = [["email", current.email], ["phone", current.phone], ["employer", current.employer], ["emergencyName", current.emergencyName], ["emergencyRelation", current.emergencyRelation], ["emergencyPhone", current.emergencyPhone]];

  return (
    <div className="space-y-6">
      <PageHeader title={m.title} muted={m.muted} sub={fill(m.sub, { property, unit })}
        actions={!editing && <PillButton icon={<Pencil className="h-4 w-4" />} disabled={!!pending} onClick={() => { reset(current); setEditing(true); }}>{m.change}</PillButton>} />

      {pending && (
        <div role="status" className="flex items-start gap-3 rounded-[5px] border border-warning/30 bg-warning/10 p-4">
          <Clock aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-warning-ink" />
          <div className="min-w-0"><p className="font-medium text-ink-900">{m.pending}</p><p className="text-[13px] text-ink-700">{fill(m.pendingBody, { date: formatDate(pending.submittedAt) })}</p>
            <ul className="mt-2 space-y-0.5 text-[13px] text-ink-700">{pending.changes.map((c) => <li key={c.field} className="truncate">{`${f[c.field]}: ${c.from || "—"} → ${c.to || "—"}`}</li>)}</ul></div>
        </div>
      )}
      {latest?.status === "rejected" && (
        <div role="status" className="flex items-start gap-3 rounded-[5px] border border-danger/25 bg-danger/10 p-4">
          <XCircle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="min-w-0"><p className="font-medium text-ink-900">{m.rejected}</p><p className="break-words text-[13px] text-ink-700">{fill(m.rejectedBody, { reason: latest.reason ?? "" })}</p></div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <GlassCard hover={false} className="space-y-4 p-5 md:p-6">
          {editing ? (
            <form noValidate onSubmit={onSubmit} className="space-y-4">
              <div><h2 className="text-h3 text-ink-900">{m.editTitle}</h2><p className="text-[13px] text-ink-500">{m.editSub}</p></div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label={f.email} type="email" error={errors.email?.message} {...register("email")} />
                <TextField label={f.phone} type="tel" error={errors.phone?.message} {...register("phone")} />
                <div className="md:col-span-2"><TextField label={f.employer} error={errors.employer?.message} {...register("employer")} /></div>
                <TextField label={f.emergencyName} error={errors.emergencyName?.message} {...register("emergencyName")} />
                <TextField label={f.emergencyRelation} error={errors.emergencyRelation?.message} {...register("emergencyRelation")} />
                <TextField label={f.emergencyPhone} type="tel" error={errors.emergencyPhone?.message} {...register("emergencyPhone")} />
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-border-soft pt-4">
                <PillButton type="button" variant="secondary" onClick={() => setEditing(false)}>{m.cancel}</PillButton>
                <PillButton type="submit" icon={<Send className="h-4 w-4" />}>{m.submit}</PillButton>
              </div>
            </form>
          ) : (
            <>
              <h2 className="text-h3 text-ink-900">{m.editable}</h2>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {rows.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-[12px] text-ink-500">{f[k]}</dt><dd className="text-[14px] font-medium text-ink-900"><TruncatedText text={v || "—"} /></dd></div>)}
              </dl>
            </>
          )}
        </GlassCard>

        <div className="space-y-4">
          <GlassCard hover={false} className="space-y-4 p-5">
            <h2 className="text-h3 text-ink-900">{m.photo}</h2>
            <AvatarUploader name={me.name} initial={me.avatar ?? null} onChange={(src) => void tenantService.setAvatar(me.id, src)} />
          </GlassCard>
          <GlassCard hover={false} className="space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-h3 text-ink-900"><Lock aria-hidden className="h-4 w-4 text-ink-500" />{m.locked}</h2>
            <dl className="grid grid-cols-2 gap-3 text-[14px]">
              <div className="col-span-2 min-w-0"><dt className="text-[12px] text-ink-500">{t.tenants.form.name}</dt><dd className="font-medium text-ink-900"><TruncatedText text={me.name} /></dd></div>
              <div><dt className="text-[12px] text-ink-500">{t.tenants.form.idNumber}</dt><dd className="font-medium text-ink-900">{`${me.idNumber.slice(0, 6)} •••• •••`}</dd></div>
              <div><dt className="text-[12px] text-ink-500">{m.rent}</dt><dd className="font-medium text-ink-900">{formatZAR(me.rent)}</dd></div>
              <div className="col-span-2"><dt className="text-[12px] text-ink-500">{m.lease}</dt><dd className="font-medium text-ink-900">{`${formatDate(me.leaseStart)} – ${formatDate(me.leaseEnd)}`}</dd></div>
            </dl>
            <p className="text-[12px] text-ink-500">{m.lockedHint}</p>
          </GlassCard>
          <GlassCard hover={false} className="space-y-3 p-5">
            <h2 className="text-h3 text-ink-900">{m.history}</h2>
            {hist.loading ? <Skel className="h-16 w-full" /> : (hist.data ?? []).filter((h) => h.kind.startsWith("change_")).length === 0 ? <p className="text-[13px] text-ink-500">{m.noHistory}</p> : (
              <Timeline items={hist.data!.filter((h) => h.kind.startsWith("change_")).slice(0, 6).map((h) => ({ title: historyLabel(h.kind, h.note), meta: formatDate(h.at), tone: h.kind === "change_rejected" ? "danger" : h.kind === "change_approved" ? "success" : "neutral" }))} />
            )}
            {latest && <StatusChip tone={latest.status === "approved" ? "success" : latest.status === "rejected" ? "danger" : "warning"} dot>{t.changes.statuses[latest.status]}</StatusChip>}
          </GlassCard>
        </div>
      </div>

      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title={m.confirmTitle} body={fill(m.confirmBody, { n: confirm?.length ?? 0 })} confirmLabel={m.submit}
        onConfirm={async () => { if (!confirm) return; await changeService.submit(me.id, confirm); toast.success(m.submitted); setEditing(false); }} />
    </div>
  );
}
