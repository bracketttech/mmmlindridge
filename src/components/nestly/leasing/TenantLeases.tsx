import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardList, FileSignature, FileText } from "lucide-react";
import { inspectionService, leaseService, signService, type EnvelopeView } from "@/services";
import { EmptyState, GlassCard, PageHeader, PillButton, Skel, TruncatedText } from "@/components/nestly/primitives";
import { fill } from "@/components/nestly/properties/shared";
import { useMyTenant } from "@/components/nestly/requests/TenantRequests";
import { useData } from "@/lib/use-data";
import { formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { EnvStatusChip, InspStateChip, l, LeaseChip, sg } from "./shared";
import { SignedPreview } from "./SignaturesView";

const tl = l.tenant;
export function TenantLeases() {
  const me = useMyTenant();
  const id = me.data?.id;
  const email = me.data?.email ?? "";
  const leases = useData(() => (id ? leaseService.forTenant(id) : Promise.resolve([])), [id]);
  const envs = useData(() => (email ? signService.forSigner(email) : Promise.resolve([])), [email]);
  const insp = useData(() => (id ? inspectionService.forTenant(id) : Promise.resolve([])), [id]);
  const [preview, setPreview] = useState<EnvelopeView | null>(null);
  const lease = (leases.data ?? []).find((x) => x.state !== "ended" && x.state !== "draft") ?? leases.data?.[0];
  const mine = (e: EnvelopeView) => e.signers.find((s) => s.email.toLowerCase() === email.toLowerCase());
  const toSign = (envs.data ?? []).filter((e) => (e.status === "sent" || e.status === "viewed") && (mine(e)?.state === "pending" || mine(e)?.state === "viewed"));
  const signed = (envs.data ?? []).filter((e) => e.status === "signed");
  const loading = me.loading || leases.loading;
  if (me.error || leases.error || envs.error) return <div className="space-y-6"><PageHeader title={tl.title} muted={tl.muted} /><GlassCard hover={false}><EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={() => { me.reload(); leases.reload(); envs.reload(); }}>{t.common.retry}</PillButton>} /></GlassCard></div>;
  return (
    <div className="space-y-6">
      <PageHeader title={tl.title} muted={tl.muted} sub={tl.sub} />
      {loading ? <Skel className="h-44" /> : !lease ? (
        <GlassCard hover={false}><EmptyState icon={<FileText className="h-6 w-6" />} title={tl.noLease} body={tl.noLeaseBody} /></GlassCard>
      ) : (
        <section className="relative overflow-hidden rounded-[9.2px] bg-olive-800 p-5 text-primary-foreground shadow-soft md:p-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="text-overline text-on-dark-muted">{tl.lease} · {lease.number}</p><TruncatedText text={lease.place} className="mt-1 text-h2" /></div>
            <LeaseChip s={lease.display} />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-[14px] md:grid-cols-4">
            {([[l.panel.term, `${formatDate(lease.start)} – ${formatDate(lease.end)}`], [l.panel.rent, formatZAR(lease.rent)], [l.panel.deposit, formatZAR(lease.deposit)], [l.panel.notice, fill(l.panel.noticeDays, { n: lease.noticeDays })]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="min-w-0"><dt className="text-[12px] text-on-dark-muted">{k}</dt><dd className="truncate font-medium tabular-nums">{v}</dd></div>
            ))}
          </dl>
          {lease.display !== "month_to_month" && lease.daysLeft >= 0 && <p className="mt-4 text-[13px] text-on-dark-muted">{fill(tl.left, { n: lease.daysLeft })} · {fill(l.panel.nextEsc, { date: formatDate(lease.nextEscalation) })} ({String(lease.escalationPct).replace(".", ",")}%)</p>}
        </section>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard hover={false} className="space-y-3 p-4 md:p-5">
          <h2 className="flex items-center gap-2 text-h3 text-ink-900"><FileSignature className="h-5 w-5 text-olive-700" aria-hidden />{tl.toSign}</h2>
          {envs.loading ? <Skel className="h-16" /> : !toSign.length ? <p className="text-[14px] text-ink-500">{tl.toSignNone}</p> : (
            <ul className="space-y-2">{toSign.map((e) => (
              <li key={e.id} className="space-y-2 rounded-[5.75px] border border-olive-700/30 bg-olive-100/60 p-3">
                <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><TruncatedText text={e.title} className="font-medium text-ink-900" /><p className="text-[12px] text-ink-500">{fill(tl.from, { name: e.createdBy })}{e.expiresAt ? ` · ${fill(tl.expires, { date: formatDate(e.expiresAt) })}` : ""}</p></div><EnvStatusChip s={e.status} /></div>
                <Link to="/sign/$token" params={{ token: mine(e)!.token }} className="inline-flex h-11 w-full items-center justify-between gap-3 rounded-full bg-olive-700 pl-5 pr-1.5 text-[14px] font-medium text-primary-foreground hover:bg-olive-800 sm:w-auto">{tl.sign}<span className="grid h-8 w-8 place-items-center rounded-full bg-surface-solid text-olive-900"><ArrowRight className="h-4 w-4" /></span></Link>
              </li>
            ))}</ul>
          )}
        </GlassCard>
        <GlassCard hover={false} className="space-y-3 p-4 md:p-5">
          <h2 className="flex items-center gap-2 text-h3 text-ink-900"><FileText className="h-5 w-5 text-olive-700" aria-hidden />{tl.signed}</h2>
          {envs.loading ? <Skel className="h-16" /> : !signed.length ? <p className="text-[14px] text-ink-500">{tl.signedNone}</p> : (
            <ul className="space-y-2">{signed.map((e) => (
              <li key={e.id}><button type="button" onClick={() => setPreview(e)} className="flex w-full min-w-0 items-center gap-3 rounded-[5.75px] border border-border-soft p-3 text-left hover:bg-olive-100/60">
                <div className="min-w-0 flex-1"><TruncatedText text={e.title} className="text-[14px] font-medium text-ink-900" /><p className="text-[12px] text-ink-500">{sg.kinds[e.kind]} · {formatDate(e.signers.map((s) => s.signedAt ?? "").sort().at(-1) ?? e.createdAt)}</p></div>
                <span className="shrink-0 text-[13px] font-medium text-olive-700">{tl.view}</span>
              </button></li>
            ))}</ul>
          )}
        </GlassCard>
      </div>
      <GlassCard hover={false} className="space-y-3 p-4 md:p-5">
        <h2 className="flex items-center gap-2 text-h3 text-ink-900"><ClipboardList className="h-5 w-5 text-olive-700" aria-hidden />{tl.inspections}</h2>
        {insp.loading ? <Skel className="h-14" /> : !(insp.data ?? []).length ? <p className="text-[14px] text-ink-500">{tl.inspectionsNone}</p> : (
          <ul className="grid gap-2 sm:grid-cols-2">{(insp.data ?? []).map((x) => (
            <li key={x.id} className="flex min-w-0 items-center gap-3 rounded-[5.75px] border border-border-soft p-3">
              <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium text-ink-900">{l.insp.types[x.type]} · {formatDate(x.date)}</p><TruncatedText text={x.place} className="text-[12px] text-ink-500" /></div>
              <InspStateChip s={x.state} />
            </li>
          ))}</ul>
        )}
      </GlassCard>
      {preview && <SignedPreview e={preview} open onOpenChange={(o) => !o && setPreview(null)} />}
    </div>
  );
}
