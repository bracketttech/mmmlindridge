import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, Send, Building, User } from "lucide-react";
import { AuthHeading, AuthLayout, TextField } from "@/components/nestly/auth";
import { PillButton, SegmentedChips, Stepper, SuccessCheck, Skel, StatusChip } from "@/components/nestly/primitives";
import { authService } from "@/services/auth";
import { planService } from "@/services";
import { PROVINCES, type Plan } from "@/mocks/plans";
import { useAppState } from "@/lib/app-state";
import { formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => pageHead("Set up your workspace", "Set up your Nestly owner workspace in four quick steps.", true),
  component: OnboardingPage,
});

const req = t.auth.validation.required;
const schema = z.object({
  kind: z.enum(["individual", "company"]),
  businessName: z.string().trim().min(2, req).max(120),
  reg: z.string().trim().max(30).optional(),
  vat: z.string().trim().max(20).optional(),
  province: z.string().min(1, req),
  propName: z.string().trim().min(2, req).max(120),
  propAddress: z.string().trim().min(3, req).max(200),
  propSuburb: z.string().trim().min(2, req).max(80),
  propCity: z.string().trim().min(2, req).max(80),
  propProvince: z.string().min(1, req),
  propUnits: z.coerce.number({ invalid_type_error: req }).int().min(1, "At least 1 unit.").max(999),
  plan: z.enum(["starter", "standard", "pro", "custom"]),
  billing: z.enum(["monthly", "annual"]),
  staff: z.array(z.object({ email: z.string().trim().email(t.auth.validation.email).or(z.literal("")), role: z.enum(["caretaker", "agent", "finance", "legal"]) })),
});
type Form = z.infer<typeof schema>;

const STEP_FIELDS: FieldPath<Form>[][] = [
  ["kind", "businessName", "reg", "vat", "province"],
  ["propName", "propAddress", "propSuburb", "propCity", "propProvince", "propUnits"],
  ["plan", "billing"],
  ["staff"],
];

function SelectField({ label, error, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string | undefined }) {
  const id = rest.id ?? rest.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[14px] font-medium text-ink-900">{label}</label>
      <select id={id} aria-invalid={!!error} className={cn("h-12 w-full rounded-[5px] border bg-surface-solid px-4 text-[15px] text-ink-900 outline-none focus:border-olive-700 focus:ring-3 focus:ring-olive-200", error ? "border-danger" : "border-input")} {...rest}>
        {children}
      </select>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}

function OnboardingPage() {
  const o = t.onboarding;
  const navigate = useNavigate();
  const { setRole } = useAppState();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const { register, handleSubmit, trigger, watch, setValue, control, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { kind: "individual", province: "Gauteng", propProvince: "Gauteng", plan: "standard", billing: "monthly", staff: [{ email: "", role: "caretaker" }] },
  });
  const staff = useFieldArray({ control, name: "staff" });
  const kind = watch("kind");
  const plan = watch("plan");
  const billing = watch("billing");

  useEffect(() => { planService.list().then(setPlans); }, []);

  const next = async () => {
    if (await trigger(STEP_FIELDS[step])) setStep((s) => s + 1);
  };
  const finish = async (data: Form, skipStaff = false) => {
    await authService.completeOnboarding(skipStaff ? { ...data, staff: [] } : data);
    setRole("owner");
    setDone(true);
  };

  if (done)
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center">
          <SuccessCheck />
          <div className="mt-6"><AuthHeading title={t.auth.welcomeTitle} muted={t.auth.welcomeMuted} sub={o.doneBody} /></div>
          <PillButton size="lg" icon={<ArrowRight className="h-4 w-4" />} onClick={() => navigate({ to: "/dashboard", replace: true })}>{o.toDashboard}</PillButton>
        </div>
      </AuthLayout>
    );

  return (
    <AuthLayout wide>
      <AuthHeading title={o.title} muted={o.muted} sub={o.sub} />
      <div className="mb-6"><Stepper steps={[...o.steps]} current={step} /></div>
      <form noValidate onSubmit={handleSubmit((d) => finish(d))} className="space-y-4">
        <h2 className="text-h2 text-ink-900">{o.steps[step]}</h2>

        {step === 0 && (
          <div key="s0" className="space-y-4 animate-rise">
            <fieldset>
              <legend className="mb-2 text-[14px] font-medium text-ink-900">{o.business.type}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["individual", "company"] as const).map((k) => (
                  <label key={k} className={cn("flex cursor-pointer items-center gap-3 rounded-[5px] border bg-surface-solid p-4 transition has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-olive-200", kind === k ? "border-olive-700 bg-olive-100" : "border-input")}>
                    <input type="radio" value={k} className="sr-only" {...register("kind")} />
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-olive-200 text-olive-900">{k === "individual" ? <User className="h-4 w-4" /> : <Building className="h-4 w-4" />}</span>
                    <span className="text-[15px]">{k === "individual" ? o.business.individual : o.business.company}</span>
                    {kind === k && <Check className="ml-auto h-4 w-4 text-olive-700" aria-hidden />}
                  </label>
                ))}
              </div>
            </fieldset>
            <TextField label={o.business.name} autoFocus error={errors.businessName?.message} {...register("businessName")} />
            {kind === "company" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label={o.business.reg} placeholder="2026/123456/07" {...register("reg")} />
                <TextField label={o.business.vat} placeholder="4123456789" {...register("vat")} />
              </div>
            )}
            <SelectField label={o.business.province} error={errors.province?.message} {...register("province")}>
              {PROVINCES.map((p) => <option key={p}>{p}</option>)}
            </SelectField>
          </div>
        )}

        {step === 1 && (
          <div key="s1" className="space-y-4 animate-rise">
            <TextField label={o.property.name} placeholder={o.property.namePh} autoFocus error={errors.propName?.message} {...register("propName")} />
            <TextField label={o.property.address} autoComplete="street-address" error={errors.propAddress?.message} {...register("propAddress")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label={o.property.suburb} error={errors.propSuburb?.message} {...register("propSuburb")} />
              <TextField label={o.property.city} error={errors.propCity?.message} {...register("propCity")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label={o.business.province} error={errors.propProvince?.message} {...register("propProvince")}>
                {PROVINCES.map((p) => <option key={p}>{p}</option>)}
              </SelectField>
              <TextField label={o.property.units} type="number" inputMode="numeric" min={1} error={errors.propUnits?.message} {...register("propUnits")} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div key="s2" className="space-y-4 animate-rise">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SegmentedChips label="Billing period" value={billing} onChange={(v) => setValue("billing", v)} options={[{ value: "monthly", label: o.plan.monthly }, { value: "annual", label: o.plan.annual }]} />
              <StatusChip tone="success">{o.plan.trial}</StatusChip>
            </div>
            <div role="radiogroup" aria-label={o.steps[2]} className="grid gap-3 sm:grid-cols-2">
              {!plans && Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="h-40" />)}
              {plans?.map((p) => {
                const sel = plan === p.id;
                const price = p.monthly === null ? o.plan.talk : formatZAR(billing === "annual" ? Math.round((p.monthly * 10) / 12) : p.monthly, { decimals: false });
                return (
                  <button type="button" role="radio" aria-checked={sel} key={p.id} onClick={() => setValue("plan", p.id)}
                    className={cn("lift rounded-[7px] border p-5 text-left transition", sel ? "border-olive-700 bg-olive-800 text-on-dark" : "glass border-surface-solid")}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-h3">{p.name}</span>
                      {sel && <span className="inline-flex items-center gap-1 rounded-full bg-surface-solid px-2.5 py-0.5 text-[12px] font-medium text-olive-900"><Check className="h-3 w-3" />{o.plan.selected}</span>}
                    </div>
                    <p className="mt-2"><span className="text-[28px] font-normal tracking-tight">{price}</span>{p.monthly !== null && <span className={cn("text-[13px]", sel ? "text-on-dark-muted" : "text-ink-500")}> {o.plan.perMonth}</span>}</p>
                    <p className={cn("text-[13px]", sel ? "text-on-dark-muted" : "text-ink-500")}>{p.maxTenants ? o.plan.tenants.replace("{n}", String(p.maxTenants)) : o.plan.custom}</p>
                    <ul className={cn("mt-3 space-y-1 text-[13px]", sel ? "text-on-dark" : "text-ink-900")}>
                      {p.features.map((f) => <li key={f} className="flex items-center gap-2"><Check aria-hidden className="h-3.5 w-3.5 shrink-0" />{f}</li>)}
                    </ul>
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] text-ink-500">{o.plan.preview}</p>
          </div>
        )}

        {step === 3 && (
          <div key="s3" className="space-y-4 animate-rise">
            <p className="text-[14px] text-ink-500">{o.staff.body}</p>
            {staff.fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
                <TextField label={o.staff.email} type="email" placeholder={t.auth.emailPh} error={errors.staff?.[i]?.email?.message} {...register(`staff.${i}.email`)} />
                <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                  <SelectField label={o.staff.role} {...register(`staff.${i}.role`)}>
                    {(["caretaker", "agent", "finance", "legal"] as const).map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
                  </SelectField>
                </div>
                <button type="button" aria-label={`${o.staff.remove} ${i + 1}`} disabled={staff.fields.length === 1} onClick={() => staff.remove(i)}
                  className="mb-1 grid h-10 w-10 place-items-center rounded-full text-ink-500 hover:bg-olive-100 disabled:opacity-40 sm:row-start-auto row-start-1 col-start-2">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <PillButton type="button" variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => staff.append({ email: "", role: "agent" })}>{o.staff.add}</PillButton>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          {step > 0 ? <PillButton type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}><span className="inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4" />{o.back}</span></PillButton> : <span />}
          <div className="flex flex-wrap gap-3">
            {step === 3 && <PillButton type="button" variant="secondary" disabled={isSubmitting} onClick={handleSubmit((d) => finish(d, true))}>{o.staff.skip}</PillButton>}
            {step < 3 ? (
              <PillButton key="next" type="button" onClick={next} icon={<ArrowRight className="h-4 w-4" />}>{o.next}</PillButton>
            ) : (
              <PillButton key="send" type="submit" disabled={isSubmitting} icon={<Send className="h-4 w-4" />}>{o.staff.send}</PillButton>
            )}
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
