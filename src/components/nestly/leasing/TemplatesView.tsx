import { useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { MERGE_FIELDS, type LeaseTemplate, type TemplateSection } from "@/mocks/leasing";
import { leaseService, mergeValuesFor, templateService, type LeaseView } from "@/services";
import { EmptyState, GlassCard, PillButton, SegmentedChips, Skel, StatusChip, TruncatedText } from "@/components/nestly/primitives";
import { Modal } from "@/components/nestly/composites";
import { SelectField } from "@/components/nestly/forms";
import { TextField } from "@/components/nestly/auth";
import { ConfirmDialog } from "@/components/nestly/overlays";
import { fill } from "@/components/nestly/properties/shared";
import { renderMerge } from "@/lib/leasing-rules";
import { useData } from "@/lib/use-data";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { l, sg } from "./shared";

const tp = l.tpl;
export function TemplatesView() {
  const tpls = useData(() => templateService.list(), []);
  const [edit, setEdit] = useState<LeaseTemplate | null>(null);
  const [del, setDel] = useState<LeaseTemplate | null>(null);
  return (
    <div className="space-y-4">
      <GlassCard hover={false} className="p-4 md:p-5"><h2 className="text-h3 text-ink-900">{tp.title}</h2><p className="text-[13px] text-ink-500">{tp.sub}</p></GlassCard>
      {tpls.error ? <GlassCard hover={false}><EmptyState tone="error" title={t.common.errorTitle} action={<PillButton variant="secondary" onClick={tpls.reload}>{t.common.retry}</PillButton>} /></GlassCard>
        : tpls.loading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skel key={i} className="h-40" />)}</div>
        : !(tpls.data ?? []).length ? <GlassCard hover={false}><EmptyState icon={<FileText className="h-6 w-6" />} /></GlassCard> : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(tpls.data ?? []).map((x) => (
              <li key={x.id} className="min-w-0">
                <GlassCard className="flex h-full flex-col gap-3 p-4">
                  <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><TruncatedText text={x.name} as="h3" className="text-h3 text-ink-900" /><p className="text-[12px] text-ink-500">{fill(tp.updated, { date: formatDate(x.updatedAt) })} · {fill(tp.sections, { n: x.sections.length })}</p></div><StatusChip tone="info">{sg.kinds[x.kind]}</StatusChip></div>
                  <TruncatedText text={x.description} lines={2} as="p" className="text-[14px] text-ink-700" />
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <PillButton size="sm" onClick={() => setEdit(x)} icon={<Pencil className="h-3.5 w-3.5" />}>{tp.edit}</PillButton>
                    <PillButton size="sm" variant="secondary" onClick={async () => { await templateService.duplicate(x.id, fill(tp.copyName, { name: x.name })); toast.success(tp.duplicated); }} icon={<Copy className="h-3.5 w-3.5" />}>{tp.duplicate}</PillButton>
                    {x.id !== "tpl-res" && <button type="button" aria-label={`${tp.delete} ${x.name}`} onClick={() => setDel(x)} className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </GlassCard>
              </li>
            ))}
          </ul>
        )}
      {edit && <TemplateEditor tpl={edit} onClose={() => setEdit(null)} />}
      {del && <ConfirmDialog open onOpenChange={(o) => !o && setDel(null)} title={tp.deleteTitle} body={fill(tp.deleteBody, { name: del.name })} onConfirm={async () => { await templateService.remove(del.id); toast.success(tp.deleted); }} />}
    </div>
  );
}

function TemplateEditor({ tpl, onClose }: { tpl: LeaseTemplate; onClose: () => void }) {
  const ed = tp.editor;
  const leases = useData(() => leaseService.list(), []);
  const [name, setName] = useState(tpl.name);
  const [sections, setSections] = useState<TemplateSection[]>(tpl.sections);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [leaseId, setLeaseId] = useState("");
  const [busy, setBusy] = useState(false);
  const focused = useRef<{ i: number; field: "heading" | "body"; el: HTMLInputElement | HTMLTextAreaElement } | null>(null);
  const sample: LeaseView | undefined = (leases.data ?? []).find((x) => x.id === leaseId) ?? leases.data?.[0];
  const values = mergeValuesFor(sample);
  const missing = new Set(sections.flatMap((s) => [...renderMerge(s.heading, values).missing, ...renderMerge(s.body, values).missing]));
  const upd = (i: number, patch: Partial<TemplateSection>) => setSections((xs) => xs.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const insert = (field: string) => {
    const f = focused.current;
    const token = `{{${field}}}`;
    if (!f) { setSections((xs) => xs.map((s, j) => (j === xs.length - 1 ? { ...s, body: `${s.body} ${token}` } : s))); return; }
    const cur = sections[f.i]![f.field];
    const start = f.el.selectionStart ?? cur.length;
    const end = f.el.selectionEnd ?? cur.length;
    upd(f.i, { [f.field]: cur.slice(0, start) + token + cur.slice(end) });
    requestAnimationFrame(() => { f.el.focus(); f.el.setSelectionRange(start + token.length, start + token.length); });
  };
  const save = async () => {
    setBusy(true);
    try { await templateService.save({ ...tpl, name: name.trim() || tpl.name, sections }); toast.success(ed.saved); onClose(); } catch { toast.error(t.common.errorBody); } finally { setBusy(false); }
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={ed.title} wide
      footer={<><PillButton variant="secondary" onClick={onClose}>{t.common.cancel}</PillButton><PillButton onClick={save} disabled={busy}>{busy ? t.common.working : ed.save}</PillButton></>}>
      <div className="space-y-4">
        <TextField label={ed.name} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex flex-wrap items-end gap-2">
          <SegmentedChips label={ed.title} value={mode} onChange={setMode} options={[{ value: "edit" as const, label: ed.edit }, { value: "preview" as const, label: ed.show }]} />
          {mode === "preview" && <div className="min-w-[200px] flex-1"><SelectField label={ed.preview} value={sample?.id ?? ""} onChange={(e) => setLeaseId(e.target.value)}>{(leases.data ?? []).map((x) => <option key={x.id} value={x.id}>{`${x.tenantName} · ${x.number}`}</option>)}</SelectField></div>}
        </div>
        {mode === "edit" ? (
          <>
            <div className="space-y-2 rounded-[5.75px] bg-olive-100/60 p-3">
              <p className="text-overline text-ink-500">{ed.fields}</p>
              <p className="text-[12px] text-ink-500">{ed.fieldsHint}</p>
              <div className="flex flex-wrap gap-1.5">
                {MERGE_FIELDS.map((f) => <button key={f} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(f)} className="rounded-full border border-olive-700/30 bg-surface-solid px-2.5 py-1 text-[12px] font-medium text-olive-900 hover:bg-olive-200">{tp.merge[f]}</button>)}
              </div>
            </div>
            <ol className="space-y-3">
              {sections.map((s, i) => (
                <li key={s.id} className="space-y-2 rounded-[5.75px] border border-border-soft p-3">
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1"><TextField label={ed.heading} value={s.heading} onFocus={(e) => (focused.current = { i, field: "heading", el: e.currentTarget })} onChange={(e) => upd(i, { heading: e.target.value })} /></div>
                    <button type="button" aria-label={ed.removeSection} onClick={() => setSections((xs) => xs.filter((_, j) => j !== i))} disabled={sections.length <= 1} className="mb-1.5 grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-danger/10 hover:text-danger disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <label className="block space-y-1.5"><span className="block text-[14px] font-medium text-ink-900">{ed.body}</span>
                    <textarea rows={3} value={s.body} onFocus={(e) => (focused.current = { i, field: "body", el: e.currentTarget })} onChange={(e) => upd(i, { body: e.target.value })} className="w-full rounded-[5.75px] border border-input bg-surface-solid px-3 py-2 text-[15px] text-ink-900 outline-none focus:border-olive-700 focus:ring-3 focus:ring-olive-200" />
                  </label>
                </li>
              ))}
            </ol>
            <PillButton variant="secondary" size="sm" onClick={() => setSections((xs) => [...xs, { id: `s${Date.now().toString(36)}`, heading: `${xs.length + 1}. `, body: "" }])} icon={<Plus className="h-3.5 w-3.5" />}>{ed.addSection}</PillButton>
          </>
        ) : (
          <div className="space-y-2">
            {missing.size > 0 && <p role="status" className="rounded-[5.75px] bg-warning/15 p-3 text-[13px] text-warning-ink">{fill(ed.missing, { n: missing.size })}: {[...missing].map((m) => tp.merge[m as keyof typeof tp.merge] ?? m).join(", ")}</p>}
            <article className="space-y-3 rounded-[5.75px] border border-border-soft bg-surface-solid p-4">
              <h3 className="text-h3 text-ink-900">{name}</h3>
              {sections.map((s) => (
                <section key={s.id}><h4 className="text-[14px] font-semibold text-ink-900"><Merged text={s.heading} values={values} /></h4><p className="mt-1 text-[14px] leading-relaxed text-ink-700"><Merged text={s.body} values={values} /></p></section>
              ))}
            </article>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Merged text with filled values highlighted and missing ones flagged. */
function Merged({ text, values }: { text: string; values: Record<string, string> }) {
  const parts = text.split(/(\{\{\s*[a-z_]+\s*\}\})/g);
  return <>{parts.map((p, i) => {
    const m = /^\{\{\s*([a-z_]+)\s*\}\}$/.exec(p);
    if (!m) return <span key={i}>{p}</span>;
    const v = values[m[1]!];
    return <mark key={i} className={cn("rounded-[3.45px] px-0.5", v ? "bg-olive-200/70 text-ink-900" : "bg-warning/20 text-warning-ink")}>{v || `[${m[1]}]`}</mark>;
  })}</>;
}
