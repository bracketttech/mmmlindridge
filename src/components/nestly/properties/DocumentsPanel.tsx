import { useMemo, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { ChevronRight, Download, FileImage, FileText, Folder, FolderOpen, MoreHorizontal, Search, ShieldCheck, Trash2, Upload, UploadCloud, X, Landmark, Ruler, Umbrella, CheckCircle2, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { documentService, StorageFullError, type DocType, type Document, type Property } from "@/services";
import { DOC_TYPES } from "@/mocks/portfolio";
import { checkUpload, formatBytes, UPLOAD_RULES } from "@/lib/portfolio-rules";
import { useData } from "@/lib/use-data";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { SelectField } from "../forms";
import { TextField } from "../auth";
import { DataTable, Modal, type Column } from "../composites";
import { ConfirmDialog, SidePanel } from "../overlays";
import { EmptyState, GlassCard, PillButton, SegmentedChips, StatusChip, TruncatedText } from "../primitives";
import { fill } from "./shared";

const dt = t.docs;
const TYPE_ICON: Record<DocType, typeof FileText> = { title_deed: Landmark, compliance: ShieldCheck, insurance: Umbrella, plans: Ruler, other: FileText };
const SOON_DAYS = 60;

function expiryState(d?: string) {
  if (!d) return null;
  const days = (new Date(d).getTime() - Date.now()) / 86_400_000;
  return days < 0 ? "expired" : days <= SOON_DAYS ? "soon" : "ok";
}

function TypeTag({ type }: { type: DocType }) {
  const Icon = TYPE_ICON[type];
  return <span className="inline-flex h-6 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full bg-olive-200 px-2.5 text-[12px] font-medium text-olive-900"><Icon aria-hidden className="h-3.5 w-3.5" />{dt.types[type]}</span>;
}

function ExpiryCell({ d }: { d?: string | undefined }) {
  const s = expiryState(d);
  if (!d || !s) return <span className="text-ink-500">—</span>;
  if (s === "expired") return <StatusChip tone="danger">{dt.expired} · {formatDate(d)}</StatusChip>;
  if (s === "soon") return <StatusChip tone="warning">{formatDate(d)}</StatusChip>;
  return <span className="tabular-nums text-ink-500">{formatDate(d)}</span>;
}

export function DocumentsPanel({ property, canManage }: { property: Property; canManage: boolean }) {
  const { data, loading, error, reload } = useData(() => documentService.list(property.id), [property.id]);
  const [view, setView] = useState<"folders" | "list">("folders");
  const [folder, setFolder] = useState<DocType | null>(null);
  const [q, setQ] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<Document | null>(null);
  const [toDelete, setToDelete] = useState<Document | null>(null);

  const docs = data ?? [];
  const rows = useMemo(() => docs.filter((d) => (!folder || d.type === folder) && (!q.trim() || d.name.toLowerCase().includes(q.trim().toLowerCase()))), [docs, folder, q]);
  const showList = view === "list" || !!folder || !!q.trim();

  const menu = (d: Document) => (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`${t.common.moreActions}: ${d.name}`} onClick={(e) => e.stopPropagation()} className="grid h-8 w-8 place-items-center rounded-full text-ink-500 hover:bg-olive-100"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-[4px] p-1.5">
        <DropdownMenuItem onSelect={() => setPreview(d)}><FileText className="h-4 w-4" />{dt.preview.title}</DropdownMenuItem>
        {canManage && <DropdownMenuItem onSelect={() => setToDelete(d)} className="text-danger focus:text-danger"><Trash2 className="h-4 w-4" />{t.common.delete}</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const nameCell = (d: Document) => {
    const Icon = d.mime.startsWith("image/") ? FileImage : FileText;
    return (
      <div className="flex min-w-0 max-w-[340px] items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-olive-100 text-olive-800"><Icon aria-hidden className="h-4 w-4" /></span>
        <TruncatedText text={d.name} className="font-medium text-ink-900" />
      </div>
    );
  };
  const cols: Column<Document>[] = [
    { key: "name", header: dt.cols.name, render: nameCell },
    { key: "type", header: dt.cols.type, render: (d) => <TypeTag type={d.type} /> },
    { key: "size", header: dt.cols.size, render: (d) => <span className="tabular-nums text-ink-500">{formatBytes(d.size)}</span> },
    { key: "up", header: dt.cols.uploaded, render: (d) => <span className="tabular-nums text-ink-500">{formatDate(d.uploadedAt)}</span> },
    { key: "exp", header: dt.cols.expires, render: (d) => <ExpiryCell d={d.expiresAt} /> },
    { key: "m", header: "", className: "w-10", render: menu },
  ];
  const card = (d: Document) => (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">{nameCell(d)}{menu(d)}</div>
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-500"><TypeTag type={d.type} /><span>{formatBytes(d.size)}</span><span>· {formatDate(d.uploadedAt)}</span>{d.expiresAt && <ExpiryCell d={d.expiresAt} />}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedChips label={`${dt.folders} / ${dt.list}`} value={view} onChange={(v) => { setView(v); if (v === "folders") setFolder(null); }}
            options={[{ value: "folders", label: dt.folders }, { value: "list", label: dt.list, count: loading ? undefined : docs.length }]} />
          <label className="relative flex min-w-0 flex-1 items-center sm:w-64 sm:flex-none">
            <span className="sr-only">{dt.search}</span>
            <Search aria-hidden className="pointer-events-none absolute left-3.5 h-4 w-4 text-ink-500" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={dt.search} className="h-10 w-full rounded-full border border-border-soft bg-surface-solid pl-10 pr-3 text-[14px] outline-none focus:border-olive-700 focus:ring-3 focus:ring-olive-200" />
          </label>
        </div>
        {canManage && <PillButton size="sm" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => setUploadOpen(true)}>{dt.upload}</PillButton>}
      </div>

      {folder && (
        <nav aria-label={dt.folders} className="flex items-center gap-1.5 text-[13px]">
          <button type="button" onClick={() => setFolder(null)} className="rounded-full px-2 py-1 font-medium text-olive-700 hover:bg-olive-100">{dt.allFolder}</button>
          <ChevronRight aria-hidden className="h-3.5 w-3.5 text-ink-500" />
          <span className="font-medium text-ink-900" aria-current="page">{dt.types[folder]}</span>
        </nav>
      )}

      {!loading && !error && docs.length === 0 ? (
        <GlassCard hover={false}>
          <EmptyState icon={<FolderOpen className="h-6 w-6" />} title={dt.emptyTitle} body={dt.emptyBody} action={canManage && <PillButton icon={<Upload className="h-4 w-4" />} onClick={() => setUploadOpen(true)}>{dt.upload}</PillButton>} />
        </GlassCard>
      ) : !showList ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {DOC_TYPES.map((type) => {
            const items = docs.filter((d) => d.type === type);
            const Icon = TYPE_ICON[type];
            const flagged = items.some((d) => expiryState(d.expiresAt) === "expired" || expiryState(d.expiresAt) === "soon");
            return (
              <li key={type}>
                <button type="button" onClick={() => setFolder(type)} className="glass lift flex h-full w-full flex-col gap-4 rounded-[6px] p-4 text-left">
                  <span className="flex items-start justify-between">
                    <span className="relative grid h-11 w-11 place-items-center rounded-[4px] bg-olive-700 text-primary-foreground">
                      <Folder aria-hidden className="h-5 w-5" />
                      <Icon aria-hidden className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-surface-solid p-0.5 text-olive-800" />
                    </span>
                    {flagged && <span className="sr-only">{dt.expiringSoon}</span>}
                    {flagged && <AlertCircle aria-hidden className="h-4 w-4 text-warning" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium text-ink-900">{dt.types[type]}</span>
                    <span className="text-[12px] text-ink-500">{loading ? "…" : fill(dt.files, { n: items.length })}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <GlassCard hover={false} className="p-2 md:p-4">
          <DataTable caption={dt.folders} rows={rows} columns={cols} loading={loading} error={error} onRetry={reload} card={card} onSelect={(id) => setPreview(rows.find((d) => d.id === id) ?? null)} selectedId={preview?.id}
            empty={<EmptyState title={dt.noMatch} />} />
        </GlassCard>
      )}

      {uploadOpen && <UploadDialog propertyId={property.id} defaultType={folder ?? "other"} onClose={() => setUploadOpen(false)} />}
      <PreviewDrawer doc={preview} onClose={() => setPreview(null)} canManage={canManage} onDelete={(d) => setToDelete(d)} />
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={fill(dt.deleteTitle, { name: toDelete?.name ?? "" })} body={dt.deleteBody}
        onConfirm={async () => { if (!toDelete) return; await documentService.remove(toDelete.id); if (preview?.id === toDelete.id) setPreview(null); toast.success(dt.deleted); }} />
    </div>
  );
}

/* ---------- Upload dialog (mock progress + validation) ---------- */
type Item = { id: string; file: File; error: string | null; progress: number; done: boolean };

function UploadDialog({ propertyId, defaultType, onClose }: { propertyId: string; defaultType: DocType; onClose: () => void }) {
  const d = dt.dialog;
  const rule = UPLOAD_RULES.document;
  const [items, setItems] = useState<Item[]>([]);
  const [type, setType] = useState<DocType>(defaultType);
  const [expires, setExpires] = useState("");
  const [drag, setDrag] = useState(false);
  const [phase, setPhase] = useState<"pick" | "uploading" | "done">("pick");
  const [notice, setNotice] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const add = (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files);
    const valid = items.filter((i) => !i.error).length;
    setNotice(valid + list.length > rule.maxFiles ? d.tooMany : null);
    setItems((cur) => [
      ...cur,
      ...list.map((file, i): Item => {
        const why = checkUpload(file, "document");
        const over = valid + i >= rule.maxFiles;
        return { id: `${Date.now()}-${i}-${file.name}`, file, progress: 0, done: false, error: over ? d.tooMany : why === "type" ? d.rejectedType : why === "size" ? d.rejectedSize : why === "empty" ? d.rejectedEmpty : null };
      }),
    ]);
    if (input.current) input.current.value = "";
  };
  const ok = items.filter((i) => !i.error);

  const start = async () => {
    setPhase("uploading");
    let failed = false;
    await Promise.all(ok.map((it) => new Promise<void>((resolve) => {
      const tick = setInterval(() => {
        setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, progress: Math.min(100, x.progress + 8 + Math.random() * 18) } : x)));
      }, 140);
      setTimeout(async () => {
        clearInterval(tick);
        try {
          const previewUrl = URL.createObjectURL(it.file);
          await documentService.add(propertyId, { name: it.file.name, type, mime: it.file.type || "application/octet-stream", size: it.file.size, expiresAt: expires || undefined }, previewUrl);
        } catch (e) { failed = true; if (e instanceof StorageFullError) toast.error(t.props.form.storageFull); }
        setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, progress: 100, done: true } : x)));
        resolve();
      }, 900 + Math.random() * 900);
    })));
    setPhase("done");
    if (!failed) toast.success(fill(dt.uploaded, { n: ok.length }));
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); if (phase === "pick") add(e.dataTransfer.files); };

  return (
    <Modal open onOpenChange={(o) => !o && phase !== "uploading" && onClose()} title={d.title} wide
      footer={phase === "done"
        ? <PillButton onClick={onClose}>{d.close}</PillButton>
        : <><PillButton variant="secondary" onClick={onClose} disabled={phase === "uploading"}>{t.common.cancel}</PillButton>
            <PillButton onClick={start} disabled={ok.length === 0 || phase === "uploading"} icon={<UploadCloud className="h-4 w-4" />}>{phase === "uploading" ? d.uploading : fill(d.save, { n: ok.length })}</PillButton></>}>
      <div className="space-y-4">
        {phase === "pick" && (
          <>
            <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
              className={cn("flex flex-col items-center gap-2 rounded-[6px] border-2 border-dashed px-4 py-8 text-center transition-colors", drag ? "border-olive-700 bg-olive-100" : "border-olive-500/40 bg-surface-solid/60")}>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-olive-200 text-olive-900"><UploadCloud aria-hidden className="h-6 w-6" /></span>
              <p className="text-[15px] font-medium text-ink-900">{d.drop}</p>
              <p className="text-[12px] text-ink-500">{d.hint}</p>
              <PillButton size="sm" variant="secondary" onClick={() => input.current?.click()}>{d.browse}</PillButton>
              <input ref={input} type="file" multiple accept={rule.types.join(",")} className="sr-only" aria-label={d.browse} onChange={(e) => add(e.target.files)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label={d.type} value={type} onChange={(e) => setType(e.target.value as DocType)}>
                {DOC_TYPES.map((x) => <option key={x} value={x}>{dt.types[x]}</option>)}
              </SelectField>
              <TextField label={d.expires} type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
            </div>
          </>
        )}
        {notice && phase === "pick" && <p role="alert" className="text-[13px] text-warning-ink">{notice}</p>}
        {items.length > 0 && (
          <ul className="space-y-2" aria-live="polite">
            {items.map((it) => (
              <li key={it.id} className={cn("rounded-[5px] border px-3 py-2.5", it.error ? "border-danger/30 bg-danger/5" : "border-border-soft bg-surface-solid")}>
                <div className="flex items-center gap-3">
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-[3px]", it.error ? "bg-danger/12 text-danger" : it.done ? "bg-olive-700 text-primary-foreground" : "bg-olive-100 text-olive-800")}>
                    {it.error ? <AlertCircle aria-hidden className="h-4 w-4" /> : it.done ? <CheckCircle2 aria-hidden className="h-4 w-4" /> : <FileText aria-hidden className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <TruncatedText text={it.file.name} className="text-[14px] font-medium text-ink-900" />
                    <p className={cn("text-[12px]", it.error ? "text-danger" : "text-ink-500")}>{it.error ?? (it.done ? `${d.done} · ${formatBytes(it.file.size)}` : formatBytes(it.file.size))}</p>
                  </div>
                  {phase === "pick" && (
                    <button type="button" aria-label={`${d.remove}: ${it.file.name}`} onClick={() => setItems((c) => c.filter((x) => x.id !== it.id))} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-olive-100"><X className="h-4 w-4" /></button>
                  )}
                </div>
                {!it.error && phase !== "pick" && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-olive-100" role="progressbar" aria-label={it.file.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(it.progress)}>
                    <div className="h-full rounded-full bg-olive-700 transition-[width] duration-150" style={{ width: `${it.progress}%` }} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/* ---------- Preview drawer ---------- */
function PreviewDrawer({ doc, onClose, canManage, onDelete }: { doc: Document | null; onClose: () => void; canManage: boolean; onDelete: (d: Document) => void }) {
  const p = dt.preview;
  const Icon = doc ? TYPE_ICON[doc.type] : FileText;
  return (
    <SidePanel open={!!doc} onOpenChange={(o) => !o && onClose()} title={doc?.name ?? p.title} wide
      footer={doc && <>
        {canManage && <PillButton variant="secondary" icon={<Trash2 className="h-3.5 w-3.5" />} size="sm" onClick={() => onDelete(doc)}>{p.delete}</PillButton>}
        {doc.previewUrl
          ? <a href={doc.previewUrl} download={doc.name} className="inline-flex h-9 items-center gap-2 rounded-full bg-olive-700 pl-4 pr-1 text-[13px] font-medium text-primary-foreground hover:bg-olive-800">{p.download}<span className="grid h-7 w-7 place-items-center rounded-full bg-surface-solid text-olive-900"><Download className="h-3.5 w-3.5" /></span></a>
          : <PillButton size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast(dt.downloadMock)}>{p.download}</PillButton>}
      </>}>
      {doc && (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[6px] border border-border-soft bg-olive-100/60">
            {doc.previewUrl && doc.mime.startsWith("image/") ? (
              <img src={doc.previewUrl} alt={doc.name} className="max-h-[60vh] w-full object-contain" />
            ) : doc.previewUrl && doc.mime === "application/pdf" ? (
              <iframe src={doc.previewUrl} title={doc.name} className="h-[60vh] w-full bg-surface-solid" />
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <div className="relative w-36 rounded-[4px] bg-surface-solid p-4 shadow-soft" aria-hidden>
                  <Icon className="mb-3 h-6 w-6 text-olive-700" />
                  {[80, 95, 70, 90, 60, 85].map((w, i) => <span key={i} className="mb-1.5 block h-1.5 rounded-full bg-olive-100" style={{ width: `${w}%` }} />)}
                </div>
                <p className="text-[14px] font-medium text-ink-900">{p.noPreview}</p>
                <p className="max-w-xs text-[12px] text-ink-500">{p.noPreviewBody}</p>
              </div>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
            <div><dt className="text-ink-500">{p.type}</dt><dd className="mt-0.5"><TypeTag type={doc.type} /></dd></div>
            <div><dt className="text-ink-500">{p.size}</dt><dd className="mt-0.5 tabular-nums text-ink-900">{formatBytes(doc.size)}</dd></div>
            <div><dt className="text-ink-500">{p.uploaded}</dt><dd className="mt-0.5 tabular-nums text-ink-900">{formatDate(doc.uploadedAt)}</dd></div>
            <div><dt className="text-ink-500">{p.uploadedBy}</dt><dd className="mt-0.5 text-ink-900">{doc.uploadedBy}</dd></div>
            <div className="col-span-2"><dt className="text-ink-500">{p.expires}</dt><dd className="mt-0.5"><ExpiryCell d={doc.expiresAt} /></dd></div>
          </dl>
        </div>
      )}
    </SidePanel>
  );
}
