import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { Building2, FileText, Search, UserRound, Wrench, X } from "lucide-react";
import { searchService, type SearchResult } from "@/services";
import { t } from "@/lib/strings";
import { Skel, TruncatedText, EmptyState } from "./primitives";

const ICON = { tenant: UserRound, property: Building2, invoice: FileText, request: Wrench };

export function SearchOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchResult[] | null>([]);
  useEffect(() => {
    if (!q.trim()) return setRes([]);
    setRes(null);
    const id = setTimeout(() => searchService.search(q).then(setRes), 150);
    return () => clearTimeout(id);
  }, [q]);
  useEffect(() => { if (!open) setQ(""); }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-olive-900/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-[10vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-[28px] bg-surface-solid shadow-soft data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <Dialog.Title className="sr-only">{t.search.title}</Dialog.Title>
          <Dialog.Description className="sr-only">{t.search.hint}</Dialog.Description>
          <div className="flex items-center gap-3 border-b border-border-soft px-5">
            <Search className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.shell.search} placeholder={t.shell.search} className="h-16 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-500" />
            <Dialog.Close aria-label={t.shell.close} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-olive-100"><X className="h-4 w-4" /></Dialog.Close>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!q.trim() && <p className="px-3 py-6 text-center text-[14px] text-ink-500">{t.search.hint}</p>}
            {res === null && <div className="space-y-2 p-2">{[0, 1, 2].map((i) => <Skel key={i} className="h-12 w-full" />)}</div>}
            {res && q.trim() && res.length === 0 && <EmptyState title={t.search.none} body={t.search.noneBody} />}
            {res?.map((r) => {
              const Icon = ICON[r.kind];
              return (
                <Link key={r.kind + r.id} to={r.to} onClick={() => onOpenChange(false)} className="flex items-center gap-3 rounded-[16px] px-3 py-2.5 hover:bg-olive-100 focus:bg-olive-100">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-olive-200 text-olive-900"><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <TruncatedText text={r.title} className="text-[14px] font-medium text-ink-900" />
                    <TruncatedText text={r.sub} className="text-[12px] text-ink-500 capitalize" />
                  </span>
                  <span className="text-overline shrink-0 text-ink-500">{t.search.kinds[r.kind]}</span>
                </Link>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
