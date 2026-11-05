import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { TextField } from "../auth";
import { SelectField, ToggleRow } from "../forms";
import { ConfirmDialog } from "../overlays";
import { AvatarUploader } from "../composites";
import { GlassCard, PageHeader, PillButton, Stepper } from "../primitives";
import { StorageFullError, tenantService, type Tenant, type TenantInput } from "@/services";
import { tenantSchema, type TenantFormInput } from "@/lib/validation";
import { formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { useUnitDirectory } from "./shared";
import { SendLinkDialog } from "./SendLinkDialog";

const STEP_FIELDS: FieldPath<TenantFormInput>[][] = [
  ["name", "email", "phone", "idNumber", "employer"],
  ["propertyId", "unitId", "rent", "deposit", "leaseStart", "leaseEnd"],
  ["occupants", "emName", "emRelation", "emPhone"],
  ["hasSurety", "suretyName", "suretyId", "suretyPhone", "suretyEmail"],
  [],
];
const money = (s: string) => Number(s.replace(/\s/g, "").replace(",", ".")) || 0;

function toForm(x?: Tenant): TenantFormInput {
  return {
    name: x?.name ?? "", email: x?.email ?? "", phone: x?.phone ?? "", idNumber: x?.idNumber ?? "", employer: x?.employer ?? "",
    propertyId: x?.propertyId ?? "", unitId: x?.unitId ?? "", rent: x ? String(x.rent) : "", deposit: x ? String(x.deposit) : "",
    leaseStart: x?.leaseStart ?? "", leaseEnd: x?.leaseEnd ?? "", occupants: x?.occupants ?? [],
    emName: x?.emergency.name ?? "", emRelation: x?.emergency.relation ?? "", emPhone: x?.emergency.phone ?? "",
    hasSurety: !!x?.surety, suretyName: x?.surety?.name ?? "", suretyId: x?.surety?.idNumber ?? "", suretyPhone: x?.surety?.phone ?? "", suretyEmail: x?.surety?.email ?? "",
  };
}
function toRecord(f: TenantFormInput, avatar: string | null): TenantInput {
  return {
    name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), idNumber: f.idNumber.trim(), employer: f.employer, avatar: avatar ?? undefined,
    propertyId: f.propertyId, unitId: f.unitId, rent: money(f.rent), deposit: money(f.deposit), leaseStart: f.leaseStart, leaseEnd: f.leaseEnd,
    occupants: f.occupants, emergency: { name: f.emName, relation: f.emRelation, phone: f.emPhone },
    surety: f.hasSurety ? { name: f.suretyName.trim(), idNumber: f.suretyId.trim(), phone: f.suretyPhone.trim(), email: f.suretyEmail.trim() } : null,
  };
}

export function TenantForm({ initial }: { initial?: Tenant }) {
  const tf = t.tenants.form;
  const editing = !!initial;
  const navigate = useNavigate();
  const dir = useUnitDirectory();
  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState<string | null>(initial?.avatar ?? null);
  const [discard, setDiscard] = useState(false);
  const [created, setCreated] = useState<Tenant | null>(null);
  const { register, control, handleSubmit, trigger, watch, setValue, getValues, formState: { errors, isSubmitting, isDirty } } = useForm<TenantFormInput>({
    resolver: zodResolver(tenantSchema), defaultValues: toForm(initial), mode: "onTouched",
  });
  const occ = useFieldArray({ control, name: "occupants" });
  const last = step === tf.steps.length - 1;
  const pid = watch("propertyId");
  const hasSurety = watch("hasSurety");
  const units = dir.units.filter((u) => u.propertyId === pid && (u.status === "vacant" || u.status === "notice" || u.id === initial?.unitId || !u.tenantId));

  const leave = () => navigate({ to: "/tenants", search: initial ? { t: initial.id } : {} });
  const next = async () => { if (await trigger(STEP_FIELDS[step], { shouldFocus: true })) setStep((s) => Math.min(s + 1, tf.steps.length - 1)); };

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (editing) {
        await tenantService.update(initial.id, toRecord(values, avatar));
        toast.success(tf.saved);
        leave();
      } else {
        const rec = await tenantService.create(toRecord(values, avatar));
        toast.success(tf.created);
        setCreated(rec);
      }
    } catch (e) { toast.error(e instanceof StorageFullError ? t.props.form.storageFull : t.common.errorBody); }
  }, (errs) => { const i = STEP_FIELDS.findIndex((fs) => fs.some((k) => k.split(".")[0]! in errs)); if (i >= 0) setStep(i); });

  const v = getValues();
  const review: [string, string][] = [
    [tf.name, v.name], [tf.email, v.email], [tf.phone, v.phone], [tf.idNumber, v.idNumber],
    [tf.property, dir.propertyName(v.propertyId)], [tf.unit, dir.unitLabel(v.unitId)], [tf.rent, formatZAR(money(v.rent))], [tf.deposit, formatZAR(money(v.deposit))],
    [t.tenants.rail.lease, v.leaseStart && v.leaseEnd ? `${formatDate(v.leaseStart)} – ${formatDate(v.leaseEnd)}` : "—"],
    [tf.occupants, String(v.occupants.length)], [tf.emergency, v.emName || "—"], [t.tenants.rail.surety, v.hasSurety ? v.suretyName : t.tenants.rail.noSurety],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={editing ? tf.editTitle : tf.newTitle} muted={editing ? initial.name : tf.newMuted} sub={editing ? dir.place(initial) : tf.newSub} />
      <GlassCard hover={false} className="animate-rise p-4 md:p-8" style={{ animationDelay: "120ms" }}>
        <div className="mx-auto max-w-3xl">
          <Stepper steps={[...tf.steps]} current={step} />
          <p className="mt-3 text-[13px] text-ink-500 sm:hidden">{`${step + 1} / ${tf.steps.length} · ${tf.steps[step]}`}</p>
          <form noValidate className="mt-8" onSubmit={(e) => { e.preventDefault(); if (last || editing) void onSubmit(); else void next(); }}>
            <h2 className="mb-5 text-h2 text-ink-900">{tf.steps[step]}</h2>
            <div key={step} className="animate-rise">
              {step === 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2"><p className="mb-2 text-[13px] font-medium text-ink-700">{tf.photo}</p><AvatarUploader name={watch("name") || "?"} initial={avatar} onChange={setAvatar} /></div>
                  <div className="md:col-span-2"><TextField label={tf.name} autoFocus autoComplete="off" error={errors.name?.message} {...register("name")} /></div>
                  <TextField label={tf.email} type="email" error={errors.email?.message} {...register("email")} />
                  <TextField label={tf.phone} type="tel" placeholder="+27 82 123 4567" error={errors.phone?.message} {...register("phone")} />
                  <TextField label={tf.idNumber} inputMode="numeric" maxLength={13} error={errors.idNumber?.message} {...register("idNumber")} />
                  <TextField label={tf.employer} error={errors.employer?.message} {...register("employer")} />
                </div>
              )}
              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField label={tf.property} error={errors.propertyId?.message} {...register("propertyId", { onChange: () => setValue("unitId", "") })}>
                    <option value="">—</option>
                    {dir.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </SelectField>
                  <SelectField label={tf.unit} disabled={!pid} error={errors.unitId?.message ?? (pid && !units.length ? tf.noUnits : undefined)}
                    {...register("unitId", { onChange: (e) => { const u = dir.units.find((x) => x.id === e.target.value); if (u) { setValue("rent", String(u.rent)); setValue("deposit", String(u.deposit)); } } })}>
                    <option value="">{tf.chooseUnit}</option>
                    {units.map((u) => <option key={u.id} value={u.id}>{`${u.label} · ${t.units.statuses[u.status]} · ${formatZAR(u.rent)}`}</option>)}
                  </SelectField>
                  <TextField label={tf.rent} inputMode="decimal" error={errors.rent?.message} {...register("rent")} />
                  <TextField label={tf.deposit} inputMode="decimal" error={errors.deposit?.message} {...register("deposit")} />
                  <TextField label={tf.leaseStart} type="date" error={errors.leaseStart?.message} {...register("leaseStart")} />
                  <TextField label={tf.leaseEnd} type="date" error={errors.leaseEnd?.message} {...register("leaseEnd")} />
                </div>
              )}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-[14px] font-medium text-ink-900">{tf.occupants}</p>
                    {occ.fields.map((f, i) => (
                      <div key={f.id} className="grid items-start gap-3 rounded-[5px] border border-border-soft p-3 sm:grid-cols-[1fr_1fr_90px_auto]">
                        <TextField label={tf.occName} error={errors.occupants?.[i]?.name?.message} {...register(`occupants.${i}.name`)} />
                        <TextField label={tf.occRelation} error={errors.occupants?.[i]?.relation?.message} {...register(`occupants.${i}.relation`)} />
                        <TextField label={tf.occAge} inputMode="numeric" maxLength={3} {...register(`occupants.${i}.age`)} />
                        <button type="button" aria-label={tf.removeOccupant} onClick={() => occ.remove(i)} className="mt-7 grid h-11 w-11 place-items-center rounded-full text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                    {occ.fields.length < 10 && <PillButton type="button" variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => occ.append({ name: "", relation: "", age: "" })}>{tf.addOccupant}</PillButton>}
                  </div>
                  <div className="space-y-3">
                    <p className="text-[14px] font-medium text-ink-900">{tf.emergency}</p>
                    <div className="grid gap-4 md:grid-cols-3">
                      <TextField label={tf.emName} error={errors.emName?.message} {...register("emName")} />
                      <TextField label={tf.emRelation} error={errors.emRelation?.message} {...register("emRelation")} />
                      <TextField label={tf.emPhone} type="tel" error={errors.emPhone?.message} {...register("emPhone")} />
                    </div>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <ToggleRow label={tf.hasSurety} hint={tf.suretyHint} checked={hasSurety} onChange={(c) => setValue("hasSurety", c, { shouldDirty: true })} />
                  {hasSurety && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField label={tf.suretyName} error={errors.suretyName?.message} {...register("suretyName")} />
                      <TextField label={tf.suretyId} inputMode="numeric" maxLength={13} error={errors.suretyId?.message} {...register("suretyId")} />
                      <TextField label={tf.suretyPhone} type="tel" error={errors.suretyPhone?.message} {...register("suretyPhone")} />
                      <TextField label={tf.suretyEmail} type="email" error={errors.suretyEmail?.message} {...register("suretyEmail")} />
                    </div>
                  )}
                </div>
              )}
              {step === 4 && (
                <div className="space-y-3">
                  <p className="text-[13px] text-ink-500">{tf.review}</p>
                  <dl className="grid gap-x-6 gap-y-3 rounded-[5px] border border-border-soft p-4 sm:grid-cols-2">
                    {review.map(([k, val]) => <div key={k} className="min-w-0"><dt className="text-[12px] text-ink-500">{k}</dt><dd className="truncate text-[14px] font-medium text-ink-900" title={val}>{val || "—"}</dd></div>)}
                  </dl>
                </div>
              )}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-5">
              <PillButton type="button" variant="ghost" onClick={() => (isDirty ? setDiscard(true) : leave())}>{tf.cancel}</PillButton>
              <div className="flex gap-2">
                {step > 0 && <PillButton type="button" variant="secondary" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep(step - 1)}>{tf.back}</PillButton>}
                {editing && !last && <PillButton type="button" variant="secondary" icon={<ArrowRight className="h-4 w-4" />} onClick={next}>{tf.next}</PillButton>}
                {editing || last
                  ? <PillButton type="submit" disabled={isSubmitting} icon={<Check className="h-4 w-4" />}>{editing ? tf.save : tf.create}</PillButton>
                  : <PillButton type="submit" icon={<ArrowRight className="h-4 w-4" />}>{tf.next}</PillButton>}
              </div>
            </div>
          </form>
        </div>
      </GlassCard>
      <ConfirmDialog open={discard} onOpenChange={setDiscard} title={tf.discardTitle} body={tf.discardBody} confirmLabel={tf.discard} onConfirm={leave} />
      {created && <SendLinkDialog tenant={created} place={{ property: dir.propertyName(created.propertyId), unit: dir.unitLabel(created.unitId) }} onClose={() => navigate({ to: "/tenants", search: { t: created.id } })} />}
    </div>
  );
}
