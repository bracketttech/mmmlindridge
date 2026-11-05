import { Link } from "@tanstack/react-router";
import { Archive, ArchiveRestore, FileText, Mail, MessageCircle, MoreHorizontal, Pencil, Phone, Send, Trash2, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NAvatar, StatusCell } from "../composites";
import { EmptyState, PillButton, Skel, StatusChip, Timeline, TruncatedText } from "../primitives";
import { changeService, requestService, tenantService, type Tenant } from "@/services";
import { useData } from "@/lib/use-data";
import { formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { fill } from "../properties/shared";
import { TenantStatus } from "./shared";

const kb = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1).replace(".", ",")} MB` : `${Math.round(n / 1e3)} KB`);

export function historyLabel(kind: keyof typeof t.tenants.history, note?: string) {
  const f = t.changes.fields as Record<string, string>;
  const n = note && kind.startsWith("change_") && kind !== "change_rejected" ? note.split(",").map((k) => f[k] ?? k).join(", ") : note;
  return n ? `${t.tenants.history[kind]} · ${n}` : t.tenants.history[kind];
}

export function ProfileRail({ x, place, canManage, onClose, onSendLink, onArchive, onDelete }: {
  x: Tenant; place: string; canManage: boolean; onClose?: () => void;
  onSendLink: () => void; onArchive: () => void; onDelete: () => void;
}) {
  const r = t.tenants.rail;
  const reqs = useData(() => requestService.forTenant(x.id), [x.id]);
  const hist = useData(() => tenantService.history(x.id), [x.id]);
  const changes = useData(() => changeService.forTenant(x.id), [x.id]);
  const pending = (changes.data ?? []).find((c) => c.status === "pending");
  const first = x.name.split(" ")[0] ?? x.name;
  const contact = [
    { href: `tel:${x.phone.replace(/\s/g, "")}`, label: fill(r.call, { name: first }), icon: Phone },
    { href: `https://wa.me/${x.phone.replace(/\D/g, "")}`, label: fill(r.whatsapp, { name: first }), icon: MessageCircle },
    { href: `mailto:${x.email}`, label: fill(r.email, { name: first }), icon: Mail },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <NAvatar name={x.name} src={x.avatar} size={56} />
        <div className="min-w-0 flex-1">
          <TruncatedText text={x.name} as="h2" className="text-h2 text-ink-900" />
          <TruncatedText text={place} className="text-[13px] text-ink-500" />
          <div className="mt-1.5 flex flex-wrap gap-1.5"><TenantStatus x={x} /><StatusChip tone={x.registered ? "success" : "neutral"}>{x.registered ? r.registered : r.notRegistered}</StatusChip></div>
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger aria-label={r.actions} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-700 hover:bg-olive-100"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-[4px] p-1.5">
              <DropdownMenuItem asChild><Link to="/tenants/$tenantId/edit" params={{ tenantId: x.id }}><Pencil className="h-4 w-4" />{r.edit}</Link></DropdownMenuItem>
              <DropdownMenuItem onSelect={onSendLink}><Send className="h-4 w-4" />{r.sendLink}</DropdownMenuItem>
              <DropdownMenuItem onSelect={onArchive}>{x.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}{x.archived ? r.restore : r.archive}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onDelete} className="text-danger focus:text-danger"><Trash2 className="h-4 w-4" />{r.delete}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {onClose && <button type="button" aria-label={r.close} onClick={onClose} className="hidden h-9 w-9 shrink-0 place-items-center rounded-full text-ink-700 hover:bg-olive-100 xl:grid"><X className="h-4 w-4" /></button>}
      </div>

      <div className="flex gap-2">
        {contact.map((c) => (
          <a key={c.label} href={c.href} aria-label={c.label} title={c.label} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
            className="grid h-11 w-11 place-items-center rounded-full border border-border-soft bg-surface-solid text-ink-900 hover:bg-olive-100"><c.icon className="h-4 w-4" /></a>
        ))}
        {canManage && !x.registered && <PillButton size="sm" className="ml-auto" icon={<Send className="h-3.5 w-3.5" />} onClick={onSendLink}>{r.sendLink}</PillButton>}
      </div>

      {pending && (
        <div className="flex items-center justify-between gap-3 rounded-[5px] border border-warning/30 bg-warning/10 px-3 py-2.5 text-[13px]">
          <span className="text-ink-900">{r.pendingChange}</span>
          {canManage && <Link to="/change-requests" search={{ id: pending.id }} className="font-medium text-olive-700 underline">{r.review}</Link>}
        </div>
      )}

      <dl className="grid grid-cols-3 gap-2">
        {[{ k: r.rent, v: formatZAR(x.rent) }, { k: r.balance, v: x.balance ? formatZAR(x.balance) : t.tenants.upToDate }, { k: r.deposit, v: formatZAR(x.deposit) }].map((s) => (
          <div key={s.k} className="min-w-0 rounded-[5px] bg-surface-solid/80 p-3">
            <dt className="text-[12px] text-ink-500">{s.k}</dt>
            <dd className={s.k === r.balance && x.balance ? "mt-0.5 text-[14px] font-semibold text-danger" : "mt-0.5 text-[14px] font-semibold text-ink-900"}><TruncatedText text={s.v} /></dd>
          </div>
        ))}
      </dl>

      <Section title={r.contact}>
        <Row k={t.tenants.form.email} v={x.email} />
        <Row k={t.tenants.form.phone} v={x.phone} />
        <Row k={r.idNumber} v={x.idNumber ? `${x.idNumber.slice(0, 6)} •••• •••` : "—"} />
        <Row k={r.employer} v={x.employer || "—"} />
        <Row k={r.lease} v={x.leaseStart ? fill(r.leaseRange, { from: formatDate(x.leaseStart), to: formatDate(x.leaseEnd) }) : "—"} />
      </Section>

      <Section title={r.occupants}>
        {x.occupants.length ? x.occupants.map((o) => <Row key={o.name} k={o.relation} v={o.age ? `${o.name} · ${o.age}` : o.name} />) : <p className="text-[13px] text-ink-500">{r.noOccupants}</p>}
      </Section>
      <Section title={r.emergency}><Row k={x.emergency.relation || "—"} v={x.emergency.name ? `${x.emergency.name} · ${x.emergency.phone}` : "—"} /></Section>
      <Section title={r.surety}>{x.surety ? <><Row k={t.tenants.form.suretyName} v={x.surety.name} /><Row k={t.tenants.form.suretyPhone} v={x.surety.phone} /></> : <p className="text-[13px] text-ink-500">{r.noSurety}</p>}</Section>

      <Section title={r.requests}>
        {reqs.loading ? <Skel className="h-12 w-full" /> : (reqs.data ?? []).length === 0 ? <p className="text-[13px] text-ink-500">{r.noRequests}</p> : (
          <ul className="space-y-2">{reqs.data!.map((q) => (
            <li key={q.id} className="flex items-center justify-between gap-2 text-[13px]"><TruncatedText text={q.title} className="min-w-0 flex-1 text-ink-900" /><StatusCell status={q.status} /></li>
          ))}</ul>
        )}
      </Section>

      <Section title={r.documents}>
        {x.docs.length === 0 ? <p className="text-[13px] text-ink-500">{r.noDocs}</p> : (
          <ul className="space-y-2">{x.docs.map((d) => (
            <li key={d.id} className="flex min-w-0 items-center gap-3 rounded-[4px] bg-surface-solid/80 p-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[3px] bg-olive-100 text-olive-700"><FileText className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1"><TruncatedText text={d.name} className="text-[13px] font-medium text-ink-900" /><p className="text-[12px] text-ink-500">{`${t.tenants.docKinds[d.kind]} · ${kb(d.size)} · ${formatDate(d.uploadedAt)}`}</p></div>
            </li>
          ))}</ul>
        )}
      </Section>

      <Section title={r.history}>
        {hist.loading ? <Skel className="h-16 w-full" /> : (hist.data ?? []).length === 0 ? <EmptyState body="—" /> : (
          <Timeline items={hist.data!.slice(0, 6).map((h) => ({ title: historyLabel(h.kind, h.note), meta: `${formatDate(h.at)} · ${h.by}`, tone: h.kind === "change_rejected" ? "danger" : h.kind === "change_approved" || h.kind === "registered" ? "success" : "neutral" }))} />
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-2 border-t border-border-soft pt-4"><h3 className="text-overline text-ink-500">{title}</h3>{children}</section>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex min-w-0 items-baseline justify-between gap-3 text-[13px]"><span className="shrink-0 text-ink-500">{k}</span><TruncatedText text={v} className="min-w-0 text-right text-ink-900" /></div>;
}
