import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Send, Trash2, UserPlus, Wand2 } from "lucide-react";
import { ENV_KINDS, FIELD_TYPES, OWNER_SIGNER, SIGNER_ROLES, type EnvKind, type FieldType, type SignerRole } from "@/mocks/leasing";
import { leaseService, mergeValuesFor, renderSections, signService, templateService, tenantService, type Signer, type SignField } from "@/services";
import { GlassCard, PageHeader, PillButton, Skel, Stepper, TruncatedText } from "@/components/nestly/primitives";
import { ChipMultiSelect, SelectField, TextAreaField } from "@/components/nestly/forms";
import { TextField } from "@/components/nestly/auth";
import { Placeholder } from "@/components/nestly/Placeholder";
import { fill } from "@/components/nestly/properties/shared";
import { DocumentView, FieldBox, l, sg, stripHeight } from "@/components/nestly/leasing/shared";
import { autoFields, renderMerge, sendIssues } from "@/lib/leasing-rules";
import { useAppState } from "@/lib/app-state";
import { useData } from "@/lib/use-data";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

type PrepSearch = { leaseId?: string | undefined; envelopeId?: string | undefined };
export const Route = createFileRoute("/_shell/leases_/prepare")({
  head: () => pageHead("Prepare for signing", "Choose a document, add signers, place signature fields and send for e-signature."),
  validateSearch: (s: Record<string, unknown>): PrepSearch => ({
    leaseId: typeof s["leaseId"] === "string" && s["leaseId"] ? s["leaseId"] : undefined,
    envelopeId: typeof s["envelopeId"] === "string" && s["envelopeId"] ? s["envelopeId"] : undefined,
  }),
  component: PreparePage,
});

const pr = l.prep;
type SignerRow = Omit<Signer, "state" | "token">;
type FieldRow = Omit<SignField, "id"> & { key: string };
const CHANNELS = ["email", "whatsapp", "sms", "in_app"] as const;
type Ch = (typeof CHANNELS)[number];
const DEFAULT_TPL: Record<EnvKind, string> = { lease: "tpl-res", addendum: "tpl-add", notice: "tpl-notice", inspection: "tpl-insp", checklist: "tpl-check" };
let seq = 0;
const uid = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

function PreparePage() {
  const { role } = useAppState();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const leases = useData(() => leaseService.list(), []);
  const tpls = useData(() => templateService.list(), []);
  const draft = useData(() => (search.envelopeId ? signService.get(search.envelopeId) : Promise.resolve(null)), [search.envelopeId]);
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<EnvKind>("lease");
  const [leaseId, setLeaseId] = useState(search.leaseId ?? "");
  const [templateId, setTemplateId] = useState("tpl-res");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [change, setChange] = useState("");
  const [signers, setSigners] = useState<SignerRow[]>([]);
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [page, setPage] = useState(0);
  const [active, setActive] = useState<{ signerId: string; type: FieldType }>({ signerId: "", type: "signature" });
  const [expires, setExpires] = useState(14);
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<Ch[]>(["email", "whatsapp"]);
  const [errTitle, setErrTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [envId, setEnvId] = useState<string | undefined>(search.envelopeId);

  const lease = (leases.data ?? []).find((x) => x.id === leaseId);
  const tenant = useData(() => (lease ? tenantService.get(lease.tenantId) : Promise.resolve(null)), [lease?.tenantId]);
  const tpl = (tpls.data ?? []).find((x) => x.id === templateId);

  // Load an existing draft once.
  useEffect(() => {
    const e = draft.data; if (!e) return;
    setKind(e.kind); setLeaseId(e.leaseId ?? ""); setTitle(e.title); setTitleTouched(true); setTemplateId(DEFAULT_TPL[e.kind]);
    setSigners(e.signers.map(({ state: _s, token: _t, viewedAt: _v, signedAt: _g, method: _m, signature: _sig, declineReason: _d, ...rest }) => rest));
    setFields(e.fields.map(({ id, ...f }) => ({ ...f, key: id })));
    setMessage(e.message ?? "");
  }, [draft.data]);

  // Auto title from document type + lease until the user edits it.
  useEffect(() => {
    if (titleTouched) return;
    setTitle(`${sg.kinds[kind]}${lease ? ` — ${lease.place.split(" · ").reverse().join(", ")}` : ""}`);
  }, [kind, lease, titleTouched]);

  const values = useMemo(() => ({ ...mergeValuesFor(lease), ...(kind !== "lease" && change.trim() ? { special_terms: change.trim() } : {}) }), [lease, kind, change]);
  const pages = useMemo(() => (tpl ? renderSections(tpl.sections, values) : []), [tpl, values]);
  const missing = useMemo(() => [...new Set((tpl?.sections ?? []).flatMap((s) => [...renderMerge(s.heading, values).missing, ...renderMerge(s.body, values).missing]))], [tpl, values]);
  const signersFull: Signer[] = signers.map((s) => ({ ...s, state: "pending", token: "" }));
  const fieldsFull: SignField[] = fields.map(({ key, ...f }) => ({ ...f, id: key }));
  const issues = sendIssues({ signers: signersFull, fields: fieldsFull });
  const nameOf = (id: string) => signers.find((s) => s.id === id)?.name || sg.roles[signers.find((s) => s.id === id)?.role ?? "tenant"];

  useEffect(() => { if (!signers.some((s) => s.id === active.signerId) && signers[0]) setActive((a) => ({ ...a, signerId: signers[0]!.id })); }, [signers, active.signerId]);
  useEffect(() => { if (page > pages.length - 1) setPage(Math.max(0, pages.length - 1)); }, [pages.length, page]);
  useEffect(() => { if (!message && title) setMessage(fill(pr.review.messageDefault, { title })); }, [title, message]);

  if (role === "tenant" || role === "caretaker" || role === "finance") return <Placeholder navKey="leases" title={pr.title} muted={pr.muted} />;

  const addSigner = (row?: Partial<SignerRow>) => setSigners((xs) => [...xs, { id: uid("s"), name: "", email: "", phone: "", role: "tenant", ...row }]);
  const quick: { label: string; row: Partial<SignerRow> }[] = [
    { label: `${sg.roles.owner} · ${OWNER_SIGNER.name}`, row: { ...OWNER_SIGNER, role: "owner" } },
    ...(tenant.data ? [{ label: `${sg.roles.tenant} · ${tenant.data.name}`, row: { name: tenant.data.name, email: tenant.data.email, phone: tenant.data.phone, role: "tenant" as const } }] : []),
    ...(tenant.data?.surety ? [{ label: `${sg.roles.surety} · ${tenant.data.surety.name}`, row: { name: tenant.data.surety.name, email: tenant.data.surety.email, phone: tenant.data.surety.phone, role: "surety" as const } }] : []),
    ...(lease?.coTenant ? [{ label: `${sg.roles.co_tenant} · ${lease.coTenant}`, row: { name: lease.coTenant, role: "co_tenant" as const } }] : []),
  ].filter((q) => !signers.some((s) => s.email && s.email.toLowerCase() === (q.row.email ?? "").toLowerCase() && q.row.email));

  const place = (e: MouseEvent<HTMLDivElement>) => {
    if (!active.signerId) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(70, ((e.clientX - r.left) / r.width) * 100 - 6));
    const y = Math.max(0, Math.round(e.clientY - r.top - 18));
    setFields((fs) => [...fs, { key: uid("f"), signerId: active.signerId, type: active.type, page, x, y }]);
  };
  const auto = () => {
    const last = Math.max(0, pages.length - 1);
    setFields((fs) => [...fs.filter((f) => f.page !== last || !signers.some((s) => s.id === f.signerId)), ...autoFields(signers.map((s) => s.id), last).map((f) => ({ ...f, key: uid("f") }))]);
    setPage(last);
    toast.success(pr.fields.autoDone);
  };
  const input = () => ({ title: title.trim(), kind, leaseId: leaseId || undefined, pages, signers, fields: fieldsFull.map(({ id: _i, ...f }) => f) });
  const persist = async () => (envId ? signService.updateDraft(envId, input()) : signService.createDraft(input()).then((id) => { setEnvId(id); return id; }));
  const saveDraft = async () => { setBusy(true); try { await persist(); toast.success(pr.review.drafted); } catch { toast.error(t.common.errorBody); } finally { setBusy(false); } };
  const send = async () => {
    if (issues.length) return;
    setBusy(true);
    try {
      const id = await persist();
      await signService.send(id, { expiresInDays: expires, message, channels: channels.map((c) => pr.channels[c]) });
      toast.success(fill(pr.review.sent, { n: signers.length }));
      navigate({ to: "/leases", search: { view: "signatures", id } });
    } catch { toast.error(t.common.errorBody); } finally { setBusy(false); }
  };
  const next = () => {
    if (step === 0 && !title.trim()) { setErrTitle(pr.errTitle); return; }
    if (step === 1 && !signers.length) { toast.error(pr.signers.none); return; }
    setErrTitle(""); setStep((s) => Math.min(3, s + 1));
  };
  const issueText = (i: (typeof issues)[number]) => fill(pr.issues[i.kind], { name: "signerId" in i ? nameOf(i.signerId) || sg.roles.tenant : "" });
  const loading = leases.loading || tpls.loading || (search.envelopeId ? draft.loading : false);
  const pg = pages[page];
  const pageFields = fields.filter((f) => f.page === page);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/leases" search={{ view: "signatures" }} className="inline-flex items-center gap-1.5 rounded-full text-[14px] font-medium text-ink-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" aria-hidden />{t.lease.views.signatures}</Link>
      <PageHeader title={pr.title} muted={pr.muted} sub={pr.sub} />
      <Stepper steps={[...pr.steps]} current={step} />
      {loading ? <Skel className="h-80" /> : (
        <GlassCard hover={false} className="space-y-5 p-4 md:p-6">
          {step === 0 && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="space-y-4">
                <SelectField label={pr.doc.kind} value={kind} onChange={(e) => { const k = e.target.value as EnvKind; setKind(k); setTemplateId(DEFAULT_TPL[k]); }}>{ENV_KINDS.map((k) => <option key={k} value={k}>{sg.kinds[k]}</option>)}</SelectField>
                <SelectField label={pr.doc.lease} value={leaseId} onChange={(e) => setLeaseId(e.target.value)}><option value="">{pr.doc.noLease}</option>{(leases.data ?? []).map((x) => <option key={x.id} value={x.id}>{`${x.tenantName} · ${x.place} · ${x.number}`}</option>)}</SelectField>
                <SelectField label={pr.doc.template} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>{(tpls.data ?? []).map((x) => <option key={x.id} value={x.id}>{`${x.name} (${sg.kinds[x.kind]})`}</option>)}</SelectField>
                <TextField label={pr.doc.title} placeholder={pr.doc.titlePh} value={title} error={errTitle} onChange={(e) => { setTitle(e.target.value); setTitleTouched(true); }} />
                {kind !== "lease" && <TextAreaField label={pr.doc.change} placeholder={pr.doc.changePh} rows={3} value={change} onChange={(e) => setChange(e.target.value)} />}
                {missing.length > 0 && <p role="status" className="rounded-[5.75px] bg-warning/15 p-3 text-[13px] text-warning-ink">{fill(pr.doc.missing, { fields: missing.map((m) => l.tpl.merge[m as keyof typeof l.tpl.merge] ?? m).join(", ") })}</p>}
              </div>
              <div className="min-w-0 space-y-2"><p className="text-overline text-ink-500">{pr.doc.preview} · {fill(pr.doc.pages, { n: pages.length })}</p><div className="max-h-[520px] overflow-y-auto"><DocumentView title={title || "—"} pages={pages} fields={[]} signers={[]} /></div></div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div><h2 className="text-h2 text-ink-900">{pr.signers.title}</h2><p className="text-[13px] text-ink-500">{pr.signers.order}</p></div>
              {quick.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5"><span className="text-overline text-ink-500">{pr.signers.quick}</span>
                  {quick.map((q) => <button key={q.label} type="button" onClick={() => addSigner(q.row)} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-olive-700/30 bg-surface-solid px-3 py-1.5 text-[13px] font-medium text-olive-900 hover:bg-olive-200"><UserPlus className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="truncate">{q.label}</span></button>)}
                </div>
              )}
              <ol className="space-y-3">
                {signers.map((s, i) => (
                  <li key={s.id} className="grid gap-3 rounded-[5.75px] border border-border-soft p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] lg:items-end">
                    <TextField label={pr.signers.name} value={s.name} onChange={(e) => setSigners((xs) => xs.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} />
                    <TextField label={pr.signers.email} type="email" value={s.email} onChange={(e) => setSigners((xs) => xs.map((y, j) => (j === i ? { ...y, email: e.target.value } : y)))} />
                    <TextField label={pr.signers.phone} type="tel" value={s.phone} onChange={(e) => setSigners((xs) => xs.map((y, j) => (j === i ? { ...y, phone: e.target.value } : y)))} />
                    <SelectField label={pr.signers.role} value={s.role} onChange={(e) => setSigners((xs) => xs.map((y, j) => (j === i ? { ...y, role: e.target.value as SignerRole } : y)))}>{SIGNER_ROLES.map((r) => <option key={r} value={r}>{sg.roles[r]}</option>)}</SelectField>
                    <button type="button" aria-label={fill(pr.signers.remove, { name: s.name || sg.roles[s.role] })} onClick={() => { setSigners((xs) => xs.filter((y) => y.id !== s.id)); setFields((fs) => fs.filter((f) => f.signerId !== s.id)); }} className="grid h-11 w-11 place-items-center justify-self-end rounded-full text-ink-500 hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ol>
              <PillButton variant="secondary" size="sm" onClick={() => addSigner()} icon={<Plus className="h-3.5 w-3.5" />}>{pr.signers.add}</PillButton>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><h2 className="text-h2 text-ink-900">{pr.fields.title}</h2><p className="text-[13px] text-ink-500">{pr.fields.sub}</p></div>
                <div className="flex gap-2"><PillButton size="sm" variant="secondary" onClick={auto} icon={<Wand2 className="h-3.5 w-3.5" />}>{pr.fields.auto}</PillButton>{fields.length > 0 && <PillButton size="sm" variant="ghost" onClick={() => setFields([])}>{pr.fields.clear}</PillButton>}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div role="radiogroup" aria-label={pr.fields.signer} className="flex flex-wrap gap-1.5">
                  {signers.map((s) => <button key={s.id} type="button" role="radio" aria-checked={active.signerId === s.id} onClick={() => setActive((a) => ({ ...a, signerId: s.id }))} className={cn("max-w-full truncate rounded-full px-3 py-1.5 text-[13px] font-medium", active.signerId === s.id ? "bg-olive-700 text-primary-foreground" : "border border-border-soft bg-surface-solid text-ink-900 hover:bg-olive-100")}>{s.name || sg.roles[s.role]}</button>)}
                </div>
                <div role="radiogroup" aria-label={pr.fields.type} className="flex flex-wrap gap-1.5 sm:justify-end">
                  {FIELD_TYPES.map((ft) => <button key={ft} type="button" role="radio" aria-checked={active.type === ft} onClick={() => setActive((a) => ({ ...a, type: ft }))} className={cn("rounded-full px-3 py-1.5 text-[13px] font-medium", active.type === ft ? "bg-olive-900 text-primary-foreground" : "border border-border-soft bg-surface-solid text-ink-900 hover:bg-olive-100")}>{sg.fields[ft]}</button>)}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button type="button" aria-label={pr.fields.prev} disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="grid h-10 w-10 place-items-center rounded-full bg-surface-solid shadow-soft disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                <p className="text-[13px] text-ink-500">{fill(pr.fields.page, { n: page + 1, total: pages.length })} · {fill(pr.fields.count, { n: fields.length })}</p>
                <button type="button" aria-label={pr.fields.next} disabled={page >= pages.length - 1} onClick={() => setPage((p) => p + 1)} className="grid h-10 w-10 place-items-center rounded-full bg-surface-solid shadow-soft disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
              </div>
              {pg && (
                <article className="rounded-[5.75px] border border-border-soft bg-surface-solid p-4 shadow-soft sm:p-6">
                  <h3 className="text-[14px] font-semibold text-ink-900">{pg.heading}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-700">{pg.body}</p>
                  <div role="button" tabIndex={0} aria-label={fill(pr.fields.tap, { type: sg.fields[active.type].toLowerCase(), name: nameOf(active.signerId) })} onClick={place}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFields((fs) => [...fs, { key: uid("f"), signerId: active.signerId, type: active.type, page, x: 8, y: Math.max(0, ...pageFields.map((f) => f.y + 46)) }]); } }}
                    className="relative mt-3 cursor-crosshair rounded-[3.45px] border border-dashed border-olive-700/40 bg-olive-100/30 outline-none focus-visible:ring-2 focus-visible:ring-olive-700" style={{ height: stripHeight(pageFields) + 50 }}>
                    {!pageFields.length && <span className="pointer-events-none absolute inset-0 grid place-items-center px-4 text-center text-[13px] text-ink-500">{fill(pr.fields.tap, { type: sg.fields[active.type].toLowerCase(), name: nameOf(active.signerId) })}</span>}
                    {pageFields.map((f) => <FieldBox key={f.key} f={{ ...f, id: f.key }} signer={signersFull.find((s) => s.id === f.signerId)} highlight={f.signerId === active.signerId} onRemove={() => setFields((fs) => fs.filter((y) => y.key !== f.key))} />)}
                  </div>
                </article>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="space-y-4">
                <h2 className="text-h2 text-ink-900">{pr.review.title}</h2>
                {issues.length ? (
                  <div role="alert" className="space-y-1 rounded-[5.75px] bg-danger/10 p-3 text-[13px] text-danger"><p className="font-medium">{pr.review.issues}</p><ul className="list-disc pl-5">{issues.map((i, k) => <li key={k}>{issueText(i)}</li>)}</ul></div>
                ) : <p role="status" className="rounded-[5.75px] bg-olive-200 p-3 text-[13px] text-olive-900">{pr.review.ready}</p>}
                <ul className="space-y-1.5">{signers.map((s) => <li key={s.id} className="flex min-w-0 items-center justify-between gap-2 text-[14px]"><TruncatedText text={`${s.name || "—"} · ${sg.roles[s.role]}`} className="text-ink-900" /><span className="shrink-0 text-[12px] text-ink-500">{fill(sg.panel.fieldsFor, { n: fields.filter((f) => f.signerId === s.id).length })}</span></li>)}</ul>
                <SelectField label={pr.review.expires} value={String(expires)} onChange={(e) => setExpires(Number(e.target.value))}>{[7, 14, 30].map((n) => <option key={n} value={n}>{fill(pr.review.days, { n })}</option>)}</SelectField>
                <TextAreaField label={pr.review.message} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
                <ChipMultiSelect label={pr.review.channels} value={channels} onChange={setChannels} options={CHANNELS.map((c) => ({ value: c, label: pr.channels[c] }))} />
              </div>
              <div className="min-w-0 max-h-[560px] overflow-y-auto"><DocumentView title={title} pages={pages} fields={fieldsFull} signers={signersFull} /></div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-soft pt-4">
            {step > 0 ? <PillButton variant="secondary" onClick={() => setStep((s) => s - 1)}>{pr.back}</PillButton> : <span />}
            <div className="flex flex-wrap gap-2">
              {step >= 1 && <PillButton variant="ghost" onClick={saveDraft} disabled={busy || !title.trim()}>{pr.review.saveDraft}</PillButton>}
              {step < 3 ? <PillButton onClick={next}>{pr.next}</PillButton> : <PillButton onClick={send} disabled={busy || issues.length > 0 || !channels.length} icon={<Send className="h-4 w-4" />}>{busy ? t.common.working : pr.review.send}</PillButton>}
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
