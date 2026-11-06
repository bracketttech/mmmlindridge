import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Ban, CheckCircle2, Clock, LinkIcon, Upload, XCircle } from "lucide-react";
import { signService, type SignMethod } from "@/services";
import { AuthHeading, Checkbox, FormAlert, TextField } from "@/components/nestly/auth";
import { TextAreaField } from "@/components/nestly/forms";
import { Modal } from "@/components/nestly/composites";
import { GlassCard, PillButton, SegmentedChips, Skel, Stepper, SuccessCheck } from "@/components/nestly/primitives";
import { fill } from "@/components/nestly/properties/shared";
import { PublicLayout } from "@/components/nestly/leasing/PublicLayout";
import { DocumentView, sg, SignatureMark, SignaturePad } from "@/components/nestly/leasing/shared";
import { SignedPreview } from "@/components/nestly/leasing/SignaturesView";
import { canSignerAct, isValidSignature, validateSignatureUpload } from "@/lib/leasing-rules";
import { useData } from "@/lib/use-data";
import { formatDate, initials } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";

export const Route = createFileRoute("/sign/$token")({
  ssr: false,
  head: () => pageHead("Sign a document", "Review and sign your document securely on any device — no login needed.", true),
  component: SignPage,
});

const s = t.sign;
const METHODS: SignMethod[] = ["draw", "type", "upload"];

function SignPage() {
  const { token } = Route.useParams();
  const data = useData(() => signService.byToken(token), [token]);
  const [step, setStep] = useState(0);
  const [outcome, setOutcome] = useState<null | { kind: "signed" } | { kind: "declined"; reason: string }>(null);
  const [preview, setPreview] = useState(false);
  const viewed = useRef(false);

  const env = data.data?.envelope;
  const me = data.data?.signer;
  const open = !!env && !!me && canSignerAct(env.status, me);

  useEffect(() => {
    if (open && !viewed.current) { viewed.current = true; void signService.markViewed(token); }
  }, [open, token]);

  if (data.loading) return <PublicLayout badge={s.secure}><div className="space-y-4" aria-busy="true"><Skel className="h-10 w-2/3" /><Skel className="h-4 w-full" /><Skel className="h-72 w-full" /><p className="text-[13px] text-ink-500">{s.loading}</p></div></PublicLayout>;
  if (data.error) return <PublicLayout badge={s.secure}><FormAlert>{t.common.errorBody}</FormAlert><PillButton className="mt-4" variant="secondary" onClick={data.reload}>{t.common.retry}</PillButton></PublicLayout>;
  if (!env || !me) return <Closed icon={<LinkIcon className="h-7 w-7" />} title={s.closed.invalidTitle} muted={s.closed.invalidMuted} body={s.closed.invalidBody} />;

  const sender = env.createdBy;
  const remaining = env.signers.filter((x) => x.state !== "signed").length;

  if (outcome?.kind === "signed") {
    return (
      <PublicLayout badge={s.secure}>
        <div className="mx-auto flex max-w-md flex-col items-center py-6 text-center">
          <SuccessCheck />
          <h1 className="mt-6 text-h1 text-ink-900">{s.done.title} <span className="text-ink-500">{s.done.muted}</span>.</h1>
          <p className="mt-2 text-[15px] text-ink-500">{fill(s.done.body, { name: me.name.split(" ")[0] ?? me.name })}</p>
          <p role="status" className="mt-4 rounded-full bg-olive-200 px-4 py-2 text-[13px] font-medium text-olive-900">{remaining === 0 ? s.done.all : fill(s.done.waiting, { n: remaining })}</p>
          <PillButton className="mt-6" onClick={() => setPreview(true)}>{s.done.copy}</PillButton>
          <p className="mt-4 text-[13px] text-ink-500">{s.done.close}</p>
        </div>
        <SignedPreview e={env} open={preview} onOpenChange={setPreview} />
      </PublicLayout>
    );
  }
  if (outcome?.kind === "declined") return <Closed icon={<XCircle className="h-7 w-7" />} title={s.decline.done} muted="" body={fill(s.decline.doneBody, { name: sender, reason: outcome.reason })} />;

  if (!open) {
    if (me.state === "signed") return (
      <Closed icon={<CheckCircle2 className="h-7 w-7" />} title={s.closed.signedTitle} muted={s.closed.signedMuted} body={fill(s.closed.signedBody, { date: me.signedAt ? formatDate(me.signedAt) : "" })}
        action={<><PillButton onClick={() => setPreview(true)}>{s.done.copy}</PillButton><SignedPreview e={env} open={preview} onOpenChange={setPreview} /></>} />
    );
    if (env.status === "expired") return <Closed icon={<Clock className="h-7 w-7" />} title={s.closed.expiredTitle} muted={s.closed.expiredMuted} body={fill(s.closed.expiredBody, { date: env.expiresAt ? formatDate(env.expiresAt) : "", name: sender })} />;
    if (env.status === "declined") return <Closed icon={<XCircle className="h-7 w-7" />} title={s.closed.declinedTitle} muted={s.closed.declinedMuted} body={fill(s.closed.declinedBody, { name: sender })} />;
    if (env.status === "voided") return <Closed icon={<Ban className="h-7 w-7" />} title={s.closed.voidedTitle} muted={s.closed.voidedMuted} body={fill(s.closed.voidedBody, { name: sender })} />;
    return <Closed icon={<LinkIcon className="h-7 w-7" />} title={s.closed.invalidTitle} muted={s.closed.invalidMuted} body={s.closed.invalidBody} />;
  }

  const myFields = env.fields.filter((f) => f.signerId === me.id).length;
  return (
    <PublicLayout badge={s.secure}>
      <div className="space-y-5">
        <div className="space-y-1">
          <p className="text-[14px] text-ink-700">{fill(s.from, { name: sender, title: env.title })}</p>
          <p className="text-[13px] text-ink-500">{fill(s.forYou, { role: sg.roles[me.role].toLowerCase() })}{env.expiresAt ? ` · ${fill(t.lease.tenant.expires, { date: formatDate(env.expiresAt) })}` : ""}</p>
        </div>
        <Stepper steps={[...s.steps]} current={step} />
        {step === 0 ? (
          <ReviewStep title={env.title} hint={fill(s.review.yourFields, { n: myFields })} onNext={() => { setStep(1); window.scrollTo({ top: 0 }); }} onDecline={async (reason) => { await signService.decline(token, reason); setOutcome({ kind: "declined", reason }); }} sender={sender}>
            <DocumentView title={env.title} pages={env.pages} fields={env.fields} signers={env.signers} highlightSignerId={me.id} showValues />
          </ReviewStep>
        ) : (
          <SignStep name={me.name} onBack={() => setStep(0)} onSign={async (method, value) => { await signService.sign(token, method, value); setStep(2); setOutcome({ kind: "signed" }); window.scrollTo({ top: 0 }); }} />
        )}
      </div>
    </PublicLayout>
  );
}

function Closed({ icon, title, muted, body, action }: { icon: React.ReactNode; title: string; muted: string; body: string; action?: React.ReactNode }) {
  return (
    <PublicLayout badge={s.secure}>
      <div className="mx-auto max-w-md py-8">
        <div className="mb-6 grid h-16 w-16 place-items-center rounded-full bg-olive-200 text-olive-900 animate-rise">{icon}</div>
        <AuthHeading title={title} muted={muted} sub={body} />
        {action}
      </div>
    </PublicLayout>
  );
}

function ReviewStep({ title, hint, children, onNext, onDecline, sender }: { title: string; hint: string; children: React.ReactNode; onNext: () => void; onDecline: (reason: string) => Promise<void>; sender: string }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (reason.trim().length < 5) { setErr(s.decline.err); return; }
    setBusy(true);
    try { await onDecline(reason.trim()); } catch { setErr(t.common.errorBody); } finally { setBusy(false); }
  };
  return (
    <section className="space-y-4" aria-label={title}>
      <div><h1 className="text-h2 text-ink-900">{s.review.title} <span className="text-ink-500">{s.review.muted}</span>.</h1><p className="mt-1 text-[13px] text-ink-500">{s.review.hint} · {hint}</p></div>
      {children}
      <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-2 rounded-full sm:flex-row sm:justify-end">
        <PillButton variant="ghost" className="justify-center bg-surface-solid/90 shadow-soft" onClick={() => setDeclining(true)}>{s.review.decline}</PillButton>
        <PillButton size="lg" onClick={onNext} icon={<ArrowRight className="h-4 w-4" />}>{s.review.next}</PillButton>
      </div>
      <Modal open={declining} onOpenChange={(o) => !busy && setDeclining(o)} title={s.decline.title}
        footer={<><PillButton variant="secondary" onClick={() => setDeclining(false)} disabled={busy}>{t.common.cancel}</PillButton><PillButton variant="danger" onClick={submit} disabled={busy}>{busy ? t.common.working : s.decline.submit}</PillButton></>}>
        <div className="space-y-3">
          <p className="text-[14px] text-ink-500">{fill(s.decline.body, { name: sender })}</p>
          <TextAreaField label={s.decline.reason} placeholder={s.decline.reasonPh} rows={3} value={reason} error={err} onChange={(e) => { setReason(e.target.value); setErr(""); }} />
        </div>
      </Modal>
    </section>
  );
}

function SignStep({ name, onBack, onSign }: { name: string; onBack: () => void; onSign: (method: SignMethod, value: string) => Promise<void> }) {
  const p = s.pad;
  const [method, setMethod] = useState<SignMethod>("draw");
  const [drawn, setDrawn] = useState<string | null>(null);
  const [typed, setTyped] = useState(name);
  const [uploaded, setUploaded] = useState<{ url: string; name: string } | null>(null);
  const [uploadErr, setUploadErr] = useState("");
  const [consent, setConsent] = useState(false);
  const [errs, setErrs] = useState<{ sig?: string; consent?: string; submit?: string }>({});
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const value = method === "draw" ? drawn ?? "" : method === "type" ? typed.trim() : uploaded?.url ?? "";
  const pick = (f?: File) => {
    if (!f) return;
    const bad = validateSignatureUpload(f);
    if (bad) { setUploadErr(fill(bad === "type" ? p.uploadType : p.uploadSize, { name: f.name })); return; }
    setUploadErr("");
    const r = new FileReader();
    r.onload = () => setUploaded({ url: String(r.result), name: f.name });
    r.readAsDataURL(f);
    if (file.current) file.current.value = "";
  };
  const submit = async () => {
    const e: typeof errs = {};
    if (!isValidSignature(method, value)) e.sig = p.errSig;
    if (!consent) e.consent = p.errConsent;
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try { await onSign(method, method === "type" ? `typed:${value}` : value); } catch { setErrs({ submit: t.common.errorBody }); setBusy(false); }
  };
  const previewValue = method === "type" ? (value ? `typed:${value}` : "") : value;

  return (
    <section className="space-y-4">
      <h1 className="text-h2 text-ink-900">{p.title} <span className="text-ink-500">{p.muted}</span>.</h1>
      <GlassCard hover={false} className="space-y-4 p-4 md:p-6">
        <SegmentedChips label={p.title} value={method} onChange={(m) => { setMethod(m); setErrs({}); }} options={METHODS.map((m) => ({ value: m, label: p.tabs[m] }))} />
        {method === "draw" && <SignaturePad label={p.drawHint} onChange={setDrawn} />}
        {method === "type" && <TextField label={p.typed} placeholder={p.typedPh} autoComplete="name" value={typed} onChange={(e) => setTyped(e.target.value)} />}
        {method === "upload" && (
          <div className="space-y-2">
            <p className="text-[14px] font-medium text-ink-900">{p.upload}</p>
            <p className="text-[12px] text-ink-500">{p.uploadHint}</p>
            {uploaded && <img src={uploaded.url} alt={p.preview} className="h-24 max-w-full rounded-[5.75px] border border-border-soft bg-surface-solid object-contain p-2" />}
            <PillButton variant="secondary" size="sm" onClick={() => file.current?.click()} icon={<Upload className="h-3.5 w-3.5" />}>{uploaded ? p.replace : p.choose}</PillButton>
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label={p.upload} onChange={(e) => pick(e.target.files?.[0])} />
            {uploadErr && <p role="alert" className="text-[13px] text-danger">{uploadErr}</p>}
          </div>
        )}
        {previewValue && isValidSignature(method, value) && (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 rounded-[5.75px] bg-olive-100/60 p-3">
            <div className="min-w-0"><p className="text-overline text-ink-500">{p.preview}</p><SignatureMark value={previewValue} name={name} className="mt-1" /></div>
            <div className="text-right"><p className="text-overline text-ink-500">{p.initials}</p><p className="mt-1 text-[22px] font-light italic leading-none text-olive-900">{initials(name)}</p></div>
          </div>
        )}
        {errs.sig && <p role="alert" className="text-[13px] text-danger">{errs.sig}</p>}
        <div className="border-t border-border-soft pt-4">
          <Checkbox label={p.consent} checked={consent} error={errs.consent} onChange={(e) => { setConsent(e.target.checked); setErrs((x) => ({ ...x, consent: undefined })); }} />
        </div>
        {errs.submit && <FormAlert>{errs.submit}</FormAlert>}
      </GlassCard>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <PillButton variant="secondary" className="justify-center" onClick={onBack} disabled={busy}>{t.lease.prep.back}</PillButton>
        <PillButton size="lg" onClick={submit} disabled={busy} icon={<ArrowRight className="h-4 w-4" />}>{busy ? p.signing : p.submit}</PillButton>
      </div>
    </section>
  );
}
