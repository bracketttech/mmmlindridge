import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, DoorOpen, HelpCircle, Paperclip, Sparkles, Wrench } from "lucide-react";
import { AREAS, PRIORITIES, type ReqCategory } from "@/mocks/maintenance";
import { requestService, type Area, type Attachment, type MaintRequest, type Priority } from "@/services";
import { GlassCard, PageHeader, PillButton, Skel, Stepper, StatusChip, SuccessCheck } from "@/components/nestly/primitives";
import { SelectField, TextAreaField } from "@/components/nestly/forms";
import { TextField } from "@/components/nestly/auth";
import { Placeholder } from "@/components/nestly/Placeholder";
import { fill, imageFileToDataUrl } from "@/components/nestly/properties/shared";
import { AttachmentThumbs, PriorityChip } from "@/components/nestly/requests/shared";
import { useMyTenant } from "@/components/nestly/requests/TenantRequests";
import { useAppState } from "@/lib/app-state";
import { validateAttachment } from "@/lib/maintenance-rules";
import { formatDate } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/requests_/new")({
  head: () => pageHead("New request", "Log a fault, request an upgrade, ask a question or give move-out notice."),
  component: NewRequestPage,
});

const r = t.req;
const ICONS: Record<ReqCategory, typeof Wrench> = { fault: Wrench, upgrade: Sparkles, query: HelpCircle, moveout: DoorOpen };
const CATS: ReqCategory[] = ["fault", "upgrade", "query", "moveout"];
const minMoveOut = () => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

function NewRequestPage() {
  const { role } = useAppState();
  const me = useMyTenant();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [cat, setCat] = useState<ReqCategory | null>(null);
  const [title, setTitle] = useState("");
  const [area, setArea] = useState<Area>("general");
  const [desc, setDesc] = useState("");
  const [moveOut, setMoveOut] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [fileErrs, setFileErrs] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>("medium");
  const [access, setAccess] = useState<string>(r.f.accessOptions[0]);
  const [errs, setErrs] = useState<Partial<Record<"category" | "title" | "description" | "moveOutDate", string>>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<MaintRequest | null>(null);

  if (role !== "tenant") return <Placeholder navKey="requests" title={r.newRequest} />;

  const validate = () => {
    const e: Partial<Record<"category" | "title" | "description" | "moveOutDate", string>> = {};
    if (step === 0 && !cat) e.category = r.errs.category;
    if (step === 1) {
      if (title.trim().length < 4) e.title = r.errs.title;
      if (desc.trim().length < 10) e.description = r.errs.description;
      if (cat === "moveout" && (!moveOut || moveOut < minMoveOut())) e.moveOutDate = r.errs.moveOutDate;
    }
    setErrs(e);
    return Object.keys(e).length === 0;
  };
  const next = () => { if (validate()) setStep((s) => s + 1); };

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const errors: string[] = [];
    let current = files.length;
    const added: Attachment[] = [];
    for (const f of Array.from(list)) {
      const e = validateAttachment(f, current);
      if (e) { errors.push(e === "count" ? r.photos.count : fill(r.photos[e], { name: f.name })); continue; }
      const url = f.type.startsWith("image/") && f.type !== "image/heic" ? await imageFileToDataUrl(f, 640, 0.7).catch(() => undefined) : undefined;
      added.push({ id: `${Date.now()}-${current}`, name: f.name, size: f.size, type: f.type, url });
      current++;
    }
    setFiles((x) => [...x, ...added]);
    setFileErrs([...new Set(errors)]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    if (!me.data || !cat) return;
    setBusy(true);
    try {
      const rec = await requestService.create({ tenantId: me.data.id, category: cat, area, title: title.trim(), description: desc.trim(), priority, access, moveOutDate: cat === "moveout" ? moveOut : undefined, attachments: files });
      setDone(rec);
    } catch { toast.error(t.common.errorBody); } finally { setBusy(false); }
  };

  if (done) return (
    <GlassCard hover={false} className="mx-auto flex max-w-lg animate-rise-in flex-col items-center gap-4 p-8 text-center">
      <SuccessCheck />
      <h1 className="text-h1 text-ink-900">{r.successTitle}</h1>
      <p className="text-[15px] text-ink-500">{fill(r.successBody, { ref: done.ref })}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <PillButton variant="secondary" onClick={() => navigate({ to: "/dashboard" })}>{r.home}</PillButton>
        <PillButton onClick={() => navigate({ to: "/requests", search: { id: done.id } })}>{r.track}</PillButton>
      </div>
    </GlassCard>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to="/requests" className="inline-flex items-center gap-1.5 text-[14px] text-ink-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" />{r.back}</Link>
      <PageHeader title={r.newRequest} muted={cat ? r.categories[cat] : undefined} />
      <Stepper steps={[...r.steps]} current={step} />
      <GlassCard hover={false} className="space-y-4 p-4 md:p-6">
        {step === 0 && (
          <div className="space-y-2">
            <div role="radiogroup" aria-label={r.steps[0]} className="grid gap-3 sm:grid-cols-2">
              {CATS.map((c) => {
                const Icon = ICONS[c];
                return (
                  <button key={c} type="button" role="radio" aria-checked={cat === c} onClick={() => { setCat(c); setErrs({}); }}
                    className={cn("flex min-w-0 items-start gap-3 rounded-[8.05px] border p-4 text-left transition", cat === c ? "border-olive-700 bg-olive-100 ring-2 ring-olive-200" : "border-border-soft bg-surface-solid hover:bg-olive-100/50")}>
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", cat === c ? "bg-olive-700 text-primary-foreground" : "bg-olive-100 text-olive-700")}><Icon className="h-5 w-5" aria-hidden /></span>
                    <span className="min-w-0"><span className="block font-medium text-ink-900">{r.categories[c]}</span><span className="block text-[13px] text-ink-500">{r.categoryHints[c]}</span></span>
                  </button>
                );
              })}
            </div>
            {errs.category && <p role="alert" className="text-[13px] text-danger">{errs.category}</p>}
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <TextField label={r.f.title} placeholder={r.f.titlePh} value={title} maxLength={80} error={errs.title} onChange={(e) => setTitle(e.target.value)} />
            {cat !== "moveout" && <SelectField label={r.f.area} value={area} onChange={(e) => setArea(e.target.value as Area)}>{AREAS.map((a) => <option key={a} value={a}>{r.areas[a]}</option>)}</SelectField>}
            {cat === "moveout" && <TextField label={r.f.moveOutDate} type="date" min={minMoveOut()} value={moveOut} error={errs.moveOutDate} onChange={(e) => setMoveOut(e.target.value)} />}
            <TextAreaField label={r.f.description} placeholder={r.f.descPh} rows={4} value={desc} error={errs.description} onChange={(e) => setDesc(e.target.value)} />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h2 className="text-h3 text-ink-900">{r.photos.title}</h2><p className="text-[13px] text-ink-500">{r.photos.hint}</p></div>
              <PillButton variant="secondary" onClick={() => fileRef.current?.click()} icon={<Paperclip className="h-4 w-4" />}>{r.photos.add}</PillButton>
              <input ref={fileRef} type="file" multiple className="sr-only" aria-label={r.photos.add} onChange={(e) => addFiles(e.target.files)} />
            </div>
            {fileErrs.length > 0 && <ul role="alert" className="space-y-1 rounded-[5.75px] border border-danger/25 bg-danger/10 px-3 py-2 text-[13px] text-danger">{fileErrs.map((e) => <li key={e}>{e}</li>)}</ul>}
            {files.length ? <AttachmentThumbs items={files} onRemove={(id) => setFiles((x) => x.filter((f) => f.id !== id))} /> : <p className="rounded-[5.75px] border border-dashed border-border-soft p-6 text-center text-[13px] text-ink-500">{r.photos.none}</p>}
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div role="radiogroup" aria-label={r.steps[3]} className="grid gap-2 sm:grid-cols-2">
              {PRIORITIES.map((p) => (
                <button key={p} type="button" role="radio" aria-checked={priority === p} onClick={() => setPriority(p)}
                  className={cn("rounded-[8.05px] border p-3 text-left transition", priority === p ? "border-olive-700 bg-olive-100 ring-2 ring-olive-200" : "border-border-soft bg-surface-solid hover:bg-olive-100/50")}>
                  <PriorityChip p={p} /><span className="mt-1 block text-[13px] text-ink-500">{r.priorityHints[p]}</span>
                </button>
              ))}
            </div>
            {cat !== "moveout" && cat !== "query" && <SelectField label={r.f.access} value={access} onChange={(e) => setAccess(e.target.value)}>{r.f.accessOptions.map((a) => <option key={a}>{a}</option>)}</SelectField>}
          </div>
        )}
        {step === 4 && cat && (
          <dl className="divide-y divide-border-soft text-[14px]">
            <h2 className="pb-3 text-h3 text-ink-900">{r.review}</h2>
            {[
              [r.steps[0], r.categories[cat]], [r.f.title, title], ...(cat === "moveout" ? [[r.f.moveOutDate, formatDate(moveOut)]] : [[r.f.area, r.areas[area]]]),
              [r.f.description, desc], [r.steps[2], files.length ? files.map((f) => f.name).join(", ") : "—"], [r.steps[3], r.priorities[priority]],
              ...(cat !== "moveout" && cat !== "query" ? [[r.f.access, access]] : []),
            ].map(([k, v]) => <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[140px_1fr]"><dt className="text-ink-500">{k}</dt><dd className="min-w-0 break-words text-ink-900">{v}</dd></div>)}
          </dl>
        )}
        {me.loading && <Skel className="h-4 w-24" />}
        <div className="flex justify-between gap-2 pt-2">
          {step > 0 ? <PillButton variant="ghost" onClick={() => setStep((s) => s - 1)}>{r.back}</PillButton> : <Link to="/requests"><PillButton variant="ghost">{r.cancel}</PillButton></Link>}
          {step < 4 ? <PillButton onClick={next}>{r.next}</PillButton> : <PillButton onClick={submit} disabled={busy || !me.data}>{busy ? <StatusChip>…</StatusChip> : r.submit}</PillButton>}
        </div>
      </GlassCard>
    </div>
  );
}
