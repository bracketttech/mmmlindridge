import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Send, Wrench } from "lucide-react";
import { requestService, tenantService, type MaintRequest } from "@/services";
import { EmptyState, GlassCard, PageHeader, PillButton, Skel, StatusChip, TruncatedText } from "@/components/nestly/primitives";
import { SidePanel } from "@/components/nestly/overlays";
import { useMediaQuery } from "@/components/nestly/tenants/shared";
import { fill } from "@/components/nestly/properties/shared";
import { canRate } from "@/lib/maintenance-rules";
import { readSession } from "@/lib/session";
import { useData } from "@/lib/use-data";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { AttachmentThumbs, PriorityChip, ReqStatusChip, Stars, StatusPipeline, Thread } from "./shared";

const r = t.req;

export function useMyTenant() { return useData(() => tenantService.me(readSession()?.email), []); }

/** Tenant request tracker: list + detail with status timeline, thread and rating prompt. */
export function TenantRequests({ selectedId, onSelect }: { selectedId?: string | undefined; onSelect: (id: string | undefined) => void }) {
  const me = useMyTenant();
  const reqs = useData(() => (me.data ? requestService.forTenant(me.data.id) : Promise.resolve([] as MaintRequest[])), [me.data?.id]);
  const wide = useMediaQuery("(min-width: 1024px)");
  const loading = me.loading || reqs.loading;
  const list = reqs.data ?? [];
  const sel = list.find((x) => x.id === selectedId) ?? null;
  const detail = sel && me.data && <TenantRequestDetail req={sel} name={me.data.name} />;

  return (
    <div className="space-y-6">
      <PageHeader title={r.tenantTitle} muted={r.tenantMuted} sub={r.tenantSub}
        actions={<Link to="/requests/new"><PillButton icon={<Plus className="h-4 w-4" />}>{r.newRequest}</PillButton></Link>} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <GlassCard hover={false} className="min-w-0 p-3 md:p-4">
          {reqs.error ? <EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={reqs.reload}>{t.common.retry}</PillButton>} />
            : loading ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skel key={i} className="h-20 w-full" />)}</div>
            : list.length === 0 ? <EmptyState icon={<Wrench className="h-6 w-6" />} title={r.emptyTitle} body={r.emptyBody} action={<Link to="/requests/new"><PillButton>{r.newRequest}</PillButton></Link>} />
            : (
              <ul className="space-y-2">
                {list.map((x) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => onSelect(x.id)} aria-current={x.id === sel?.id ? "true" : undefined}
                      className={cn("w-full min-w-0 rounded-[5px] border border-border-soft p-3 text-left transition-colors", x.id === sel?.id ? "bg-olive-100" : "bg-surface-solid/80 hover:bg-surface-solid")}>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <TruncatedText text={x.title} className="font-medium text-ink-900" />
                          <p className="text-[12px] text-ink-500">{x.ref} · {r.categoryShort[x.category]} · {formatDate(x.createdAt)}</p>
                        </div>
                        <ReqStatusChip s={x.status} />
                      </div>
                      {canRate(x) && <p className="mt-2 text-[12px] font-medium text-olive-700">★ {r.rate.title}</p>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </GlassCard>
        {wide && <GlassCard hover={false} className="hidden min-w-0 self-start p-5 lg:block">{detail || <EmptyState icon={<Wrench className="h-6 w-6" />} body={r.selectOne} />}</GlassCard>}
      </div>
      {!wide && <SidePanel open={!!sel} onOpenChange={(o) => !o && onSelect(undefined)} title={sel?.title ?? ""} wide>{detail}</SidePanel>}
    </div>
  );
}

function TenantRequestDetail({ req, name }: { req: MaintRequest; name: string }) {
  const [msg, setMsg] = useState("");
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const send = async () => { if (!msg.trim()) return; await requestService.addMessage(req.id, msg.trim(), false, name, "tenant"); setMsg(""); toast.success(r.detail.sent); };
  const rate = async () => { await requestService.rate(req.id, stars, comment.trim()); toast.success(r.rate.thanks); };
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2"><span className="text-[12px] font-medium text-ink-500">{req.ref}</span><StatusChip>{r.categoryShort[req.category]}</StatusChip><PriorityChip p={req.priority} /><ReqStatusChip s={req.status} /></div>
        <h2 className="hidden lg:block"><TruncatedText text={req.title} lines={2} className="text-h2 text-ink-900" /></h2>
        <p className="whitespace-pre-wrap text-[14px] text-ink-900">{req.description}</p>
        {req.assignee && <p className="text-[13px] text-ink-500">{r.detail.assign}: {req.assignee.name}</p>}
      </div>
      {canRate(req) && (
        <section className="animate-rise-in space-y-3 rounded-[7px] border border-olive-200 bg-olive-100/60 p-4">
          <h3 className="text-h3 text-ink-900">{r.rate.title}</h3>
          <p className="text-[13px] text-ink-500">{fill(r.rate.body, { ref: req.ref })}</p>
          <Stars value={stars} onChange={setStars} />
          <textarea aria-label={r.rate.comment} placeholder={r.rate.comment} value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="w-full resize-none rounded-[5px] border border-input bg-surface-solid px-3 py-2 text-[14px] outline-none focus:border-olive-700" />
          <PillButton disabled={!stars} onClick={rate}>{r.rate.submit}</PillButton>
        </section>
      )}
      {req.rating && <section className="space-y-1"><h3 className="text-overline text-ink-500">{r.rate.yours}</h3><Stars value={req.rating.stars} size={18} />{req.rating.comment && <p className="text-[13px] text-ink-500">“{req.rating.comment}”</p>}</section>}
      <section className="space-y-2"><h3 className="text-overline text-ink-500">{r.detail.timeline}</h3><StatusPipeline req={req} /></section>
      {req.attachments.length > 0 && <section className="space-y-2"><h3 className="text-overline text-ink-500">{r.detail.attachments}</h3><AttachmentThumbs items={req.attachments} /></section>}
      <section className="space-y-2">
        <h3 className="text-overline text-ink-500">{r.detail.thread}</h3>
        <Thread msgs={req.thread} viewer="tenant" />
        <div className="flex items-end gap-2">
          <textarea aria-label={r.detail.msgPh} placeholder={r.detail.msgPh} value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} className="min-w-0 flex-1 resize-none rounded-[5px] border border-input bg-surface-solid px-3 py-2 text-[14px] outline-none focus:border-olive-700" />
          <PillButton size="sm" disabled={!msg.trim()} onClick={send} icon={<Send className="h-3.5 w-3.5" />}>{r.detail.send}</PillButton>
        </div>
      </section>
    </div>
  );
}
