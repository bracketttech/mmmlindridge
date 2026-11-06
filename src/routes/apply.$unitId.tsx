import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, FileText, Home, Upload, X } from "lucide-react";
import type { FileMeta } from "@/mocks/leasing";
import { applicationService } from "@/services";
import { AuthHeading, Checkbox, FormAlert, TextField } from "@/components/nestly/auth";
import { TextAreaField } from "@/components/nestly/forms";
import { GlassCard, PillButton, Skel, Stepper, SuccessCheck, TruncatedText } from "@/components/nestly/primitives";
import { FadeImage } from "@/components/nestly/fade-image";
import { fill, resolvePhoto } from "@/components/nestly/properties/shared";
import { fmtSize } from "@/components/nestly/requests/shared";
import { PublicLayout } from "@/components/nestly/leasing/PublicLayout";
import { todayIso } from "@/components/nestly/leasing/shared";
import { emailField, phoneField } from "@/lib/validation";
import { useData } from "@/lib/use-data";
import { formatZAR } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";

export const Route = createFileRoute("/apply/$unitId")({
  ssr: false,
  head: () => pageHead("Rental application", "Apply for a rental home on Nestly — share your details, documents and consent in a few minutes.", true),
  component: ApplyPage,
});

const ap = t.apps.apply;
const FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const FILE_MAX = 10 * 1024 * 1024;
type Values = { name: string; email: string; phone: string; idNumber: string; employer: string; income: string; moveIn: string; occupants: string; message: string };
type Errs = Partial<Record<keyof Values | "docs" | "popia" | "credit" | "submit", string>>;

function ApplyPage() {
  const { unitId } = Route.useParams();
  const vac = useData(() => applicationService.vacancy(unitId), [unitId]);
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Values>({ name: "", email: "", phone: "", idNumber: "", employer: "", income: "", moveIn: "", occupants: "1", message: "" });
  const [docs, setDocs] = useState<FileMeta[]>([]);
  const [popia, setPopia] = useState(false);
  const [credit, setCredit] = useState(false);
  const [errs, setErrs] = useState<Errs>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const up = (k: keyof Values, val: string) => { setV((s) => ({ ...s, [k]: val })); setErrs((e) => ({ ...e, [k]: undefined })); };
  const income = Number(v.income.replace(/\s/g, "").replace(",", "."));

  if (vac.loading) return <PublicLayout><div className="space-y-4" aria-busy="true"><Skel className="h-10 w-2/3" /><Skel className="h-40 w-full" /><Skel className="h-12 w-full" /><Skel className="h-12 w-full" /></div></PublicLayout>;
  if (vac.error) return <PublicLayout><FormAlert>{t.common.errorBody}</FormAlert><PillButton className="mt-4" variant="secondary" onClick={vac.reload}>{t.common.retry}</PillButton></PublicLayout>;
  const u = vac.data;
  if (!u) return (
    <PublicLayout><div className="mx-auto max-w-md py-8">
      <div className="mb-6 grid h-16 w-16 place-items-center rounded-full bg-olive-200 text-olive-900"><Home className="h-7 w-7" aria-hidden /></div>
      <AuthHeading title={ap.closedTitle} muted={ap.closedMuted} sub={ap.closedBody} />
    </div></PublicLayout>
  );
  if (done) return (
    <PublicLayout><div className="mx-auto flex max-w-md flex-col items-center py-6 text-center">
      <SuccessCheck />
      <h1 className="mt-6 text-h1 text-ink-900">{ap.successTitle} <span className="text-ink-500">{ap.successMuted}</span>.</h1>
      <p className="mt-2 text-[15px] text-ink-500">{fill(ap.successBody, { name: v.name.trim().split(" ")[0] ?? "", owner: ap.owner, unit: `${u.label}, ${u.propertyName}` })}</p>
    </div></PublicLayout>
  );

  const validate = (s: number): Errs => {
    const e: Errs = {};
    if (s === 0) {
      if (v.name.trim().length < 2) e.name = ap.errs.name;
      if (!emailField.safeParse(v.email).success) e.email = ap.errs.email;
      if (!phoneField.safeParse(v.phone).success) e.phone = ap.errs.phone;
      if (v.idNumber.trim().length < 6) e.idNumber = ap.errs.idNo;
    }
    if (s === 1) {
      if (!v.employer.trim()) e.employer = ap.errs.employer;
      if (!(income > 0)) e.income = ap.errs.income;
      if (!v.moveIn) e.moveIn = ap.errs.moveIn;
      const n = Number(v.occupants);
      if (!(Number.isInteger(n) && n >= 1 && n <= 10)) e.occupants = ap.errs.occupants;
    }
    if (s === 2 && !docs.length) e.docs = ap.errs.docs;
    if (s === 3) { if (!popia) e.popia = ap.errs.popia; if (!credit) e.credit = ap.errs.credit; }
    return e;
  };
  const next = () => { const e = validate(step); setErrs(e); if (!Object.keys(e).length) { setStep((s) => s + 1); window.scrollTo({ top: 0 }); } };
  const addFiles = (list: FileList | null) => {
    if (!list) return;
    let err = "";
    const add: FileMeta[] = [];
    for (const f of Array.from(list)) {
      if (!FILE_TYPES.includes(f.type)) { err = fill(t.apps.scr.fileType, { name: f.name }); continue; }
      if (f.size > FILE_MAX) { err = fill(t.apps.scr.fileSize, { name: f.name }); continue; }
      if (!docs.some((d) => d.name === f.name)) add.push({ name: f.name, size: f.size, type: f.type });
    }
    setDocs((d) => [...d, ...add]);
    setErrs((e) => ({ ...e, docs: err || undefined }));
    if (file.current) file.current.value = "";
  };
  const submit = async () => {
    const e = validate(3); setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await applicationService.submit(u.unitId, { name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), idNumber: v.idNumber.trim(), employer: v.employer.trim(), income, moveIn: v.moveIn, occupants: Number(v.occupants), message: v.message.trim(), popiaConsent: popia, creditConsent: credit, docs });
      setDone(true); window.scrollTo({ top: 0 });
    } catch { setErrs({ submit: t.common.errorBody }); } finally { setBusy(false); }
  };
  const photo = resolvePhoto(u.photo);

  return (
    <PublicLayout>
      <div className="space-y-5">
        <AuthHeading title={ap.title} muted={u.label} sub={fill(ap.sub, { property: u.propertyName, rent: formatZAR(u.rent) })} />
        <GlassCard hover={false} className="flex items-center gap-3 p-3">
          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-[5.75px] bg-olive-200">{photo && <FadeImage src={photo} alt={u.propertyName} width={160} height={128} className="absolute inset-0 h-full w-full object-cover" />}</div>
          <div className="min-w-0 flex-1"><TruncatedText text={`${u.label} · ${u.propertyName}`} className="text-[15px] font-medium text-ink-900" /><p className="text-[13px] text-ink-500">{fill(t.apps.vac.beds, { beds: u.beds, baths: u.baths })} · {fill(t.apps.vac.rent, { rent: formatZAR(u.rent, { decimals: false }) })}</p></div>
        </GlassCard>
        <Stepper steps={[...ap.steps]} current={step} />
        <p className="text-[13px] font-medium text-ink-900 sm:hidden">{ap.steps[step]}</p>
        <GlassCard hover={false} className="space-y-4 p-4 md:p-6">
          {step === 0 && <>
            <TextField label={ap.name} autoComplete="name" value={v.name} error={errs.name} onChange={(e) => up("name", e.target.value)} />
            <TextField label={ap.email} type="email" autoComplete="email" value={v.email} error={errs.email} onChange={(e) => up("email", e.target.value)} />
            <TextField label={ap.phone} type="tel" autoComplete="tel" placeholder="+27 82 555 0123" value={v.phone} error={errs.phone} onChange={(e) => up("phone", e.target.value)} />
            <TextField label={ap.idNo} inputMode="text" value={v.idNumber} error={errs.idNumber} onChange={(e) => up("idNumber", e.target.value)} />
          </>}
          {step === 1 && <>
            <TextField label={ap.employer} autoComplete="organization" value={v.employer} error={errs.employer} onChange={(e) => up("employer", e.target.value)} />
            <TextField label={ap.income} inputMode="decimal" placeholder="45 000" value={v.income} error={errs.income} hint={income > 0 ? formatZAR(income) : undefined} onChange={(e) => up("income", e.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label={ap.moveIn} type="date" min={todayIso()} value={v.moveIn} error={errs.moveIn} onChange={(e) => up("moveIn", e.target.value)} />
              <TextField label={ap.occupants} type="number" min={1} max={10} inputMode="numeric" value={v.occupants} error={errs.occupants} onChange={(e) => up("occupants", e.target.value)} />
            </div>
            <TextAreaField label={ap.message} rows={3} value={v.message} onChange={(e) => up("message", e.target.value)} />
          </>}
          {step === 2 && <div className="space-y-3">
            <div><p className="text-[14px] font-medium text-ink-900">{ap.docs}</p><p className="text-[12px] text-ink-500">{ap.docsHint}</p></div>
            {docs.length > 0 && <ul className="space-y-1.5">{docs.map((d) => (
              <li key={d.name} className="flex min-w-0 items-center gap-2 rounded-[5.75px] border border-border-soft bg-surface-solid px-3 py-2 text-[13px]">
                <FileText className="h-4 w-4 shrink-0 text-olive-700" aria-hidden /><TruncatedText text={d.name} className="flex-1 text-ink-900" /><span className="shrink-0 text-ink-500">{fmtSize(d.size)}</span>
                <button type="button" aria-label={fill(ap.remove, { name: d.name })} onClick={() => setDocs((xs) => xs.filter((x) => x.name !== d.name))} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-danger/10 hover:text-danger"><X className="h-4 w-4" /></button>
              </li>
            ))}</ul>}
            <PillButton variant="secondary" onClick={() => file.current?.click()} icon={<Upload className="h-4 w-4" />}>{ap.add}</PillButton>
            <input ref={file} type="file" multiple accept=".pdf,image/jpeg,image/png" className="sr-only" aria-label={ap.docs} onChange={(e) => addFiles(e.target.files)} />
            {errs.docs && <p role="alert" className="text-[13px] text-danger">{errs.docs}</p>}
          </div>}
          {step === 3 && <div className="space-y-4">
            <Checkbox label={fill(ap.popia, { owner: ap.owner })} checked={popia} error={errs.popia} onChange={(e) => { setPopia(e.target.checked); setErrs((x) => ({ ...x, popia: undefined })); }} />
            <Checkbox label={fill(ap.credit, { owner: ap.owner })} checked={credit} error={errs.credit} onChange={(e) => { setCredit(e.target.checked); setErrs((x) => ({ ...x, credit: undefined })); }} />
            <p className="rounded-[5.75px] bg-olive-100/60 p-3 text-[13px] text-ink-700">{ap.consentNote}</p>
            {errs.submit && <FormAlert>{errs.submit}</FormAlert>}
          </div>}
        </GlassCard>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {step > 0 ? <PillButton variant="secondary" className="justify-center" onClick={() => setStep((s) => s - 1)} disabled={busy}>{ap.back}</PillButton> : <span />}
          {step < 3 ? <PillButton size="lg" onClick={next} icon={<ArrowRight className="h-4 w-4" />}>{ap.next}</PillButton>
            : <PillButton size="lg" onClick={submit} disabled={busy} icon={<ArrowRight className="h-4 w-4" />}>{busy ? ap.submitting : ap.submit}</PillButton>}
        </div>
      </div>
    </PublicLayout>
  );
}
