import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Star, Trash2 } from "lucide-react";
import { TextField } from "../auth";
import { ChipMultiSelect, SelectField, TextAreaField, ToggleRow } from "../forms";
import { ConfirmDialog } from "../overlays";
import { GlassCard, PageHeader, PillButton, Stepper } from "../primitives";
import { FadeImage } from "../fade-image";
import { propertyService, StorageFullError, type PropertyInput, type PropertyRecord } from "@/services";
import { AMENITIES, PROPERTY_TYPES, type Amenity } from "@/mocks/portfolio";
import { PROVINCES } from "@/mocks/plans";
import { propertySchema, type PropertyFormInput } from "@/lib/validation";
import { checkUpload, UPLOAD_RULES } from "@/lib/portfolio-rules";
import { t } from "@/lib/strings";
import { fill, imageFileToDataUrl, resolvePhoto } from "./shared";

const STEP_FIELDS: FieldPath<PropertyFormInput>[][] = [
  ["name", "type", "description", "yearBuilt"],
  ["address", "suburb", "city", "province", "postalCode", "erf"],
  [],
  ["amenities"],
  ["municipality", "accountNo", "ratesMonthly", "electricity", "electricityMeter", "waterMeter"],
  ["rulesText", "pets", "smoking", "quietFrom", "quietTo"],
];

function toForm(p?: PropertyRecord): PropertyFormInput {
  return {
    name: p?.name ?? "", type: p?.type ?? "apartment_block", description: p?.description ?? "", yearBuilt: p?.yearBuilt ?? "",
    address: p?.address ?? "", suburb: p?.suburb ?? "", city: p?.city ?? "", province: p?.province ?? "Gauteng", postalCode: p?.postalCode ?? "", erf: p?.erf ?? "",
    amenities: p?.amenities ?? [],
    municipality: p?.municipal.municipality ?? "", accountNo: p?.municipal.accountNo ?? "", ratesMonthly: p?.municipal.ratesMonthly ? String(p.municipal.ratesMonthly) : "",
    electricity: p?.municipal.electricity ?? "prepaid", electricityMeter: p?.municipal.electricityMeter ?? "", waterMeter: p?.municipal.waterMeter ?? "",
    rulesText: p?.rules.text ?? "", pets: p?.rules.pets ?? false, smoking: p?.rules.smoking ?? false, quietFrom: p?.rules.quietFrom ?? "22:00", quietTo: p?.rules.quietTo ?? "06:00",
  };
}

function toRecord(f: PropertyFormInput, photos: string[]): PropertyInput {
  return {
    name: f.name, type: f.type, description: f.description, yearBuilt: f.yearBuilt,
    address: f.address, suburb: f.suburb, city: f.city, province: f.province, postalCode: f.postalCode, erf: f.erf,
    photos, amenities: f.amenities as Amenity[],
    municipal: { municipality: f.municipality, accountNo: f.accountNo, ratesMonthly: Number(f.ratesMonthly.replace(/\s/g, "").replace(",", ".")) || 0, electricity: f.electricity, electricityMeter: f.electricityMeter, waterMeter: f.waterMeter },
    rules: { text: f.rulesText, pets: f.pets, smoking: f.smoking, quietFrom: f.quietFrom, quietTo: f.quietTo },
  };
}

export function PropertyForm({ initial }: { initial?: PropertyRecord }) {
  const f = t.props.form;
  const p = t.props;
  const editing = !!initial;
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [photoErrors, setPhotoErrors] = useState<string[]>([]);
  const [photosDirty, setPhotosDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, trigger, watch, setValue, formState: { errors, isSubmitting, isDirty } } = useForm<PropertyFormInput>({
    resolver: zodResolver(propertySchema),
    defaultValues: toForm(initial),
    mode: "onTouched",
  });
  const last = step === f.steps.length - 1;

  const leave = () => (editing ? navigate({ to: "/properties/$propertyId", params: { propertyId: initial.id }, search: { tab: "overview" } }) : navigate({ to: "/properties" }));
  const cancel = () => (isDirty || photosDirty ? setDiscard(true) : leave());

  const next = async () => {
    if (await trigger(STEP_FIELDS[step], { shouldFocus: true })) setStep((s) => Math.min(s + 1, f.steps.length - 1));
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const rule = UPLOAD_RULES.photo;
    const errs: string[] = [];
    const room = rule.maxFiles - photos.length;
    const list = Array.from(files);
    if (list.length > room) errs.push(fill(f.photoTooMany, { n: rule.maxFiles }));
    const accepted: string[] = [];
    for (const file of list.slice(0, Math.max(room, 0))) {
      const why = checkUpload(file, "photo");
      if (why) { errs.push(`${file.name}: ${why === "type" ? f.photoType : why === "size" ? f.photoSize : t.docs.dialog.rejectedEmpty}`); continue; }
      try { accepted.push(await imageFileToDataUrl(file)); } catch { errs.push(`${file.name}: ${f.photoType}`); }
    }
    setPhotoErrors(errs);
    if (accepted.length) { setPhotos((ph) => [...ph, ...accepted]); setPhotosDirty(true); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const onSubmit = handleSubmit(
    async (values) => {
      try {
        if (editing) {
          await propertyService.update(initial.id, toRecord(values, photos));
          toast.success(f.saved);
          navigate({ to: "/properties/$propertyId", params: { propertyId: initial.id }, search: { tab: "overview" } });
        } else {
          const rec = await propertyService.create(toRecord(values, photos));
          toast.success(f.created);
          navigate({ to: "/properties/$propertyId", params: { propertyId: rec.id }, search: { tab: "units" } });
        }
      } catch (e) {
        toast.error(e instanceof StorageFullError ? f.storageFull : t.common.errorBody);
      }
    },
    (errs) => {
      // Jump to the first step that has an error (edit mode can save from any step).
      const i = STEP_FIELDS.findIndex((fs) => fs.some((k) => k in errs));
      if (i >= 0) setStep(i);
    },
  );

  const amenities = watch("amenities");

  return (
    <div className="space-y-6">
      <PageHeader title={editing ? f.editTitle : f.newTitle} muted={editing ? initial.name : f.newMuted} sub={editing ? `${initial.address}, ${initial.suburb}` : f.newSub} />
      <GlassCard hover={false} className="animate-rise p-4 md:p-8" style={{ animationDelay: "120ms" }}>
        <div className="mx-auto max-w-3xl">
          <Stepper steps={[...f.steps]} current={step} />
          <p className="mt-3 text-[13px] text-ink-500 sm:hidden">{`${step + 1} / ${f.steps.length} · ${f.steps[step]}`}</p>

          <form onSubmit={(e) => { e.preventDefault(); if (last || editing) void onSubmit(); else void next(); }} noValidate className="mt-8">
            <h2 className="mb-5 text-h2 text-ink-900">{f.steps[step]}</h2>
            <div key={step} className="animate-rise">
              {step === 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2"><TextField label={f.name} placeholder={f.namePh} autoFocus error={errors.name?.message} {...register("name")} /></div>
                  <SelectField label={f.type} error={errors.type?.message} {...register("type")}>
                    {PROPERTY_TYPES.map((x) => <option key={x} value={x}>{p.types[x]}</option>)}
                  </SelectField>
                  <TextField label={f.yearBuilt} inputMode="numeric" maxLength={4} placeholder="2012" error={errors.yearBuilt?.message} {...register("yearBuilt")} />
                  <div className="md:col-span-2"><TextAreaField label={f.description} placeholder={f.descriptionPh} maxLength={500} error={errors.description?.message} {...register("description")} /></div>
                </div>
              )}
              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2"><TextField label={f.address} placeholder={f.addressPh} autoComplete="street-address" error={errors.address?.message} {...register("address")} /></div>
                  <TextField label={f.suburb} error={errors.suburb?.message} {...register("suburb")} />
                  <TextField label={f.city} error={errors.city?.message} {...register("city")} />
                  <SelectField label={f.province} error={errors.province?.message} {...register("province")}>
                    {PROVINCES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </SelectField>
                  <TextField label={f.postalCode} inputMode="numeric" maxLength={4} placeholder="2196" error={errors.postalCode?.message} {...register("postalCode")} />
                  <div className="md:col-span-2"><TextField label={f.erf} placeholder={f.erfPh} error={errors.erf?.message} {...register("erf")} /></div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-[13px] text-ink-500">{f.photosHint}</p>
                  <input ref={fileRef} type="file" multiple accept={UPLOAD_RULES.photo.types.join(",")} className="sr-only" aria-label={f.addPhotos} onChange={(e) => void addPhotos(e.target.files)} />
                  {photoErrors.length > 0 && (
                    <ul role="alert" className="space-y-1 rounded-[5.75px] border border-danger/25 bg-danger/10 px-4 py-3 text-[13px] text-danger">
                      {photoErrors.map((e) => <li key={e} className="break-words">{e}</li>)}
                    </ul>
                  )}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {photos.map((ph, i) => {
                      const src = resolvePhoto(ph);
                      return (
                        <figure key={`${i}-${ph.slice(-12)}`} className="group relative aspect-[4/3] overflow-hidden rounded-[5.75px] bg-olive-200">
                          {src && <FadeImage src={src} alt={`${f.photos} ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" />}
                          {i === 0 && <span className="absolute left-2 top-2 inline-flex h-6 items-center gap-1 rounded-full bg-olive-700 px-2 text-[11px] font-medium text-primary-foreground"><Star aria-hidden className="h-3 w-3" />{f.cover}</span>}
                          <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1.5">
                            {i > 0 && (
                              <button type="button" onClick={() => { setPhotos((x) => [x[i]!, ...x.filter((_, j) => j !== i)]); setPhotosDirty(true); }} aria-label={`${f.makeCover} ${i + 1}`} className="grid h-8 w-8 place-items-center rounded-full bg-surface-solid/90 text-ink-900 shadow-soft hover:bg-surface-solid"><Star className="h-3.5 w-3.5" /></button>
                            )}
                            <button type="button" onClick={() => { setPhotos((x) => x.filter((_, j) => j !== i)); setPhotosDirty(true); }} aria-label={`${f.removePhoto} ${i + 1}`} className="grid h-8 w-8 place-items-center rounded-full bg-surface-solid/90 text-danger shadow-soft hover:bg-surface-solid"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </figure>
                      );
                    })}
                    {photos.length < UPLOAD_RULES.photo.maxFiles && (
                      <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-[5.75px] border-2 border-dashed border-olive-500/40 bg-surface-solid/60 text-[13px] font-medium text-olive-700 transition hover:bg-olive-100">
                        <ImagePlus aria-hidden className="h-6 w-6" />{f.addPhotos}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-[13px] text-ink-500">{f.amenitiesHint}</p>
                  <ChipMultiSelect label={t.props.detail.amenities} value={amenities} onChange={(v) => setValue("amenities", v, { shouldDirty: true })}
                    options={AMENITIES.map((a) => ({ value: a, label: p.amenities[a] }))} />
                </div>
              )}
              {step === 4 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label={f.municipality} placeholder={f.municipalityPh} error={errors.municipality?.message} {...register("municipality")} />
                  <TextField label={f.accountNo} error={errors.accountNo?.message} {...register("accountNo")} />
                  <TextField label={f.rates} inputMode="decimal" placeholder="18 450" error={errors.ratesMonthly?.message} {...register("ratesMonthly")} />
                  <SelectField label={f.electricity} {...register("electricity")}>
                    <option value="prepaid">{f.prepaid}</option>
                    <option value="conventional">{f.conventional}</option>
                  </SelectField>
                  <TextField label={f.electricityMeter} error={errors.electricityMeter?.message} {...register("electricityMeter")} />
                  <TextField label={f.waterMeter} error={errors.waterMeter?.message} {...register("waterMeter")} />
                </div>
              )}
              {step === 5 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2"><TextAreaField label={f.rulesText} placeholder={f.rulesPh} maxLength={1000} error={errors.rulesText?.message} {...register("rulesText")} /></div>
                  <ToggleRow label={f.pets} checked={watch("pets")} onChange={(v) => setValue("pets", v, { shouldDirty: true })} />
                  <ToggleRow label={f.smoking} checked={watch("smoking")} onChange={(v) => setValue("smoking", v, { shouldDirty: true })} />
                  <TextField type="time" label={f.quietFrom} {...register("quietFrom")} />
                  <TextField type="time" label={f.quietTo} {...register("quietTo")} />
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-5">
              <div className="flex gap-2">
                {step > 0 ? (
                  <PillButton type="button" variant="secondary" onClick={() => setStep((s) => s - 1)} icon={<ArrowLeft className="h-4 w-4" />}>{f.back}</PillButton>
                ) : (
                  <PillButton type="button" variant="ghost" onClick={cancel}>{f.cancel}</PillButton>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {editing && !last && <PillButton type="button" variant="secondary" onClick={() => void next()} icon={<ArrowRight className="h-4 w-4" />}>{f.next}</PillButton>}
                {editing || last ? (
                  <PillButton type="submit" disabled={isSubmitting} aria-busy={isSubmitting} icon={<Check className="h-4 w-4" />}>{isSubmitting ? t.common.working : editing ? f.save : f.create}</PillButton>
                ) : (
                  <PillButton type="submit" icon={<ArrowRight className="h-4 w-4" />}>{f.next}</PillButton>
                )}
              </div>
            </div>
          </form>
        </div>
      </GlassCard>
      <ConfirmDialog open={discard} onOpenChange={setDiscard} title={f.discardTitle} body={f.discardBody} confirmLabel={f.discard} onConfirm={() => { leave(); }} />
      <span className="sr-only" aria-live="polite">{f.steps[step]}</span>
    </div>
  );
}
