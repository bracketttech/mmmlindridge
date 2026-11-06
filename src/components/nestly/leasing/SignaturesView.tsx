import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bell, Copy, Download, ExternalLink, FileSignature, Search } from "lucide-react";
import { signService, type EnvelopeView, type EnvStatus } from "@/services";
import { EmptyState, GlassCard, PillButton, SegmentedChips, TruncatedText } from "@/components/nestly/primitives";
import { DataTable, Modal, type Column } from "@/components/nestly/composites";
import { ConfirmDialog, SidePanel } from "@/components/nestly/overlays";
import { fill } from "@/components/nestly/properties/shared";
import { fmtDateTime } from "@/components/nestly/requests/shared";
import { ErrorCard } from "@/components/nestly/billing/OwnerBilling";
import type { useData } from "@/lib/use-data";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";
import { AuditTrail, Certificate, copyText, DocumentView, EnvStatusChip, sg, SignatureMark, SignerChip, signUrl } from "./shared";
import type { SetLeaseSearch } from "./OwnerLeases";

type Filter = "all" | EnvStatus;
export function SignaturesView({ data, id, set }: { data: ReturnType<typeof useData<EnvelopeView[]>>; id?: string | undefined; set: SetLeaseSearch }) {
  const [f, setF] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const all = data.data ?? [];
  const rows = all.filter((e) => (f === "all" || e.status === f) && (!q.trim() || `${e.title} ${e.signers.map((s) => s.name).join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())));
  const sel = all.find((e) => e.id === id) ?? null;
  const filters: Filter[] = ["all", "draft", "sent", "viewed", "signed", "declined", "expired"];
  const columns: Column<EnvelopeView>[] = [
    { key: "d", header: sg.cols.document, render: (e) => <div className="min-w-0 max-w-[260px]"><TruncatedText text={e.title} className="font-medium text-ink-900" /><TruncatedText text={`${sg.kinds[e.kind]} · ${e.place}`} className="text-[12px] text-ink-500" /></div> },
    { key: "s", header: sg.cols.signers, render: (e) => <div className="min-w-0 max-w-[200px]"><TruncatedText text={e.signers.map((s) => s.name).join(", ") || "—"} className="text-ink-900" /><span className="text-[12px] text-ink-500">{fill(sg.signed, { n: e.signedCount, total: e.signers.length })}</span></div> },
    { key: "sent", header: sg.cols.sent, render: (e) => <span className="whitespace-nowrap text-ink-500">{e.sentAt ? formatDate(e.sentAt) : sg.notSent}</span> },
    { key: "exp", header: sg.cols.expires, render: (e) => <span className="whitespace-nowrap text-ink-500">{e.expiresAt ? formatDate(e.expiresAt) : "—"}</span> },
    { key: "st", header: sg.cols.status, render: (e) => <EnvStatusChip s={e.status} /> },
  ];
  const card = (e: EnvelopeView) => (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><TruncatedText text={e.title} className="font-medium text-ink-900" /><TruncatedText text={`${sg.kinds[e.kind]} · ${e.place}`} className="text-[12px] text-ink-500" /></div><EnvStatusChip s={e.status} /></div>
      <div className="flex items-center justify-between gap-2 text-[13px] text-ink-500"><span>{fill(sg.signed, { n: e.signedCount, total: e.signers.length })}</span><span>{e.sentAt ? formatDate(e.sentAt) : sg.notSent}</span></div>
    </div>
  );
  return (
    <div className="space-y-4">
      <GlassCard hover={false} className="space-y-3 p-3 md:p-4">
        <label className="relative block min-w-0 sm:max-w-xs"><span className="sr-only">{t.lease.search}</span><Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.lease.search} className="h-11 w-full rounded-[5.75px] border border-input bg-surface-solid pl-9 pr-3 text-[15px] outline-none focus:border-olive-700" /></label>
        <SegmentedChips wrap label={sg.cols.status} value={f} onChange={setF} options={filters.map((s) => ({ value: s, label: s === "all" ? t.lease.all : sg.statuses[s], count: s === "all" ? all.length : all.filter((e) => e.status === s).length }))} />
      </GlassCard>
      {data.error ? <ErrorCard onRetry={data.reload} /> : (
        <GlassCard hover={false} className="p-3 md:p-4">
          <DataTable rows={rows} columns={columns} loading={data.loading} caption={t.lease.views.signatures} selectedId={id} onSelect={(i) => set({ id: i }, false)} card={card}
            empty={all.length === 0 ? <EmptyState icon={<FileSignature className="h-6 w-6" />} title={sg.emptyTitle} body={sg.emptyBody} /> : <EmptyState icon={<Search className="h-6 w-6" />} title={sg.zeroTitle} action={<PillButton variant="secondary" onClick={() => { setF("all"); setQ(""); }}>{t.lease.clear}</PillButton>} />} />
        </GlassCard>
      )}
      <EnvelopePanel e={sel} onClose={() => set({ id: undefined })} />
    </div>
  );
}

export function EnvelopePanel({ e, onClose }: { e: EnvelopeView | null; onClose: () => void }) {
  const p = sg.panel;
  const [preview, setPreview] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const open = e && (e.status === "sent" || e.status === "viewed");
  const remind = async () => { if (!e) return; await signService.remind(e.id); toast.success(fill(p.reminded, { names: e.signers.filter((s) => s.state !== "signed").map((s) => s.name.split(" ")[0]).join(", ") })); };
  const copy = async (token: string) => { if (await copyText(signUrl(token))) toast.success(p.copied); else toast.error(t.common.errorBody); };
  const declined = e?.signers.find((s) => s.state === "declined");
  return (
    <SidePanel open={!!e} onOpenChange={(o) => !o && onClose()} title={e?.title ?? ""} wide
      footer={e ? <>
        {e.status === "draft" && <PillButton variant="ghost" onClick={() => setDelOpen(true)}>{p.deleteDraft}</PillButton>}
        {open && <PillButton variant="ghost" onClick={() => setVoidOpen(true)}>{p.void}</PillButton>}
        {e.status === "expired" && <PillButton variant="secondary" onClick={async () => { await signService.extend(e.id, 7); toast.success(p.extended); }}>{p.extend}</PillButton>}
        {open && <PillButton variant="secondary" onClick={remind} icon={<Bell className="h-4 w-4" />}>{p.remind}</PillButton>}
        {e.status === "draft"
          ? <Link to="/leases/prepare" search={{ envelopeId: e.id }} className="inline-flex h-11 items-center rounded-full bg-olive-700 px-5 text-[14px] font-medium text-primary-foreground hover:bg-olive-800">{p.continueDraft}</Link>
          : <PillButton onClick={() => setPreview(true)}>{e.status === "signed" ? p.preview : p.previewDraft}</PillButton>}
      </> : undefined}>
      {e && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><TruncatedText text={e.place} className="text-[14px] text-ink-900" /><p className="text-[12px] text-ink-500">{sg.kinds[e.kind]}{e.leaseNumber ? ` · ${e.leaseNumber}` : ""}{e.sentAt ? ` · ${fmtDateTime(e.sentAt)}` : ""}</p></div>
            <EnvStatusChip s={e.status} />
          </div>
          {e.status === "declined" && declined && <p role="status" className="rounded-[5.75px] bg-danger/10 p-3 text-[13px] text-danger">{fill(p.declinedNote, { name: declined.name })} {fill(p.declined, { reason: declined.declineReason ?? "" })}</p>}
          {e.status === "expired" && e.expiresAt && <p role="status" className="rounded-[5.75px] bg-danger/10 p-3 text-[13px] text-danger">{fill(p.expiredNote, { date: formatDate(e.expiresAt) })}</p>}
          {e.status === "signed" && <p role="status" className="rounded-[5.75px] bg-olive-200 p-3 text-[13px] text-olive-900">{fill(p.completedNote, { date: formatDate(e.signers.map((s) => s.signedAt ?? "").sort().at(-1) ?? "") })}</p>}
          <section className="space-y-2"><h3 className="text-overline text-ink-500">{p.signers}</h3>
            <ul className="space-y-2">{e.signers.map((s) => (
              <li key={s.id} className="space-y-2 rounded-[5.75px] border border-border-soft p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1"><TruncatedText text={s.name} className="text-[14px] font-medium text-ink-900" /><TruncatedText text={`${sg.roles[s.role]} · ${s.email}`} className="text-[12px] text-ink-500" /></div>
                  <SignerChip s={s.state} />
                </div>
                {s.state === "signed" && <div className="flex items-end justify-between gap-2"><SignatureMark value={s.signature} name={s.name} className="max-w-[60%]" /><span className="text-[12px] text-ink-500">{s.signedAt ? fmtDateTime(s.signedAt) : ""}</span></div>}
                {s.state === "declined" && s.declineReason && <TruncatedText text={fill(p.declined, { reason: s.declineReason })} lines={2} className="text-[12px] text-danger" />}
                {open && (s.state === "pending" || s.state === "viewed") && (
                  <div className="flex flex-wrap gap-1.5">
                    <PillButton size="sm" variant="secondary" onClick={() => copy(s.token)} icon={<Copy className="h-3.5 w-3.5" />}>{p.copy}</PillButton>
                    <a href={`/sign/${s.token}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-olive-700 hover:bg-olive-100"><ExternalLink className="h-3.5 w-3.5" aria-hidden />{p.open}</a>
                  </div>
                )}
              </li>
            ))}</ul>
          </section>
          <section className="space-y-2"><h3 className="text-overline text-ink-500">{p.audit}</h3><p className="text-[12px] text-ink-500">{p.auditHint}</p><AuditTrail events={e.audit} /></section>
          <ConfirmDialog open={voidOpen} onOpenChange={setVoidOpen} title={p.voidTitle} body={fill(p.voidBody, { title: e.title })} confirmLabel={p.void} onConfirm={async () => { await signService.voidEnvelope(e.id); toast.success(p.voided); }} />
          <ConfirmDialog open={delOpen} onOpenChange={setDelOpen} title={p.deleteDraft} body={e.title} onConfirm={async () => { await signService.removeDraft(e.id); toast.success(p.draftDeleted); onClose(); }} />
          <SignedPreview e={e} open={preview} onOpenChange={setPreview} />
        </div>
      )}
    </SidePanel>
  );
}

export function SignedPreview({ e, open, onOpenChange }: { e: EnvelopeView; open: boolean; onOpenChange: (o: boolean) => void }) {
  const done = e.status === "signed";
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={e.title} wide
      footer={<PillButton variant="secondary" onClick={() => toast.info(sg.downloaded)} icon={<Download className="h-4 w-4" />}>{sg.download}</PillButton>}>
      <DocumentView title={e.title} pages={e.pages} fields={e.fields} signers={e.signers} showValues mark={done ? sg.watermark : sg.draftMark}
        footer={done ? <Certificate signers={e.signers} audit={e.audit} /> : undefined} />
    </Modal>
  );
}
