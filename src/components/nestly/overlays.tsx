import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { Modal } from "./composites";
import { PillButton } from "./primitives";

/** Confirmation dialog for destructive actions. `onConfirm` may be async; the button shows progress. */
export function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel = t.common.delete, onConfirm, tone = "danger" }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; body: ReactNode; confirmLabel?: string; onConfirm: () => Promise<unknown> | void; tone?: "danger" | "primary";
}) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { await onConfirm(); onOpenChange(false); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onOpenChange={(o) => !busy && onOpenChange(o)} title={title}
      footer={<>
        <PillButton variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>{t.common.cancel}</PillButton>
        <PillButton variant={tone === "danger" ? "danger" : "primary"} onClick={run} disabled={busy} aria-busy={busy}>{busy ? t.common.working : confirmLabel}</PillButton>
      </>}>
      <div className="flex items-start gap-3">
        {tone === "danger" && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-danger/12 text-danger"><AlertTriangle aria-hidden className="h-5 w-5" /></span>}
        <div className="text-[14px] text-ink-500">{body}</div>
      </div>
    </Modal>
  );
}

/** Right-hand drawer on desktop, bottom sheet on mobile. */
export function SidePanel({ open, onOpenChange, title, children, footer, wide = false }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-olive-900/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-[8px] bg-surface-solid shadow-soft outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
          "md:inset-y-3 md:left-auto md:right-3 md:max-h-none md:rounded-[8px] md:data-[state=open]:slide-in-from-right md:data-[state=open]:slide-in-from-bottom-0",
          wide ? "md:w-[560px]" : "md:w-[460px]",
        )}>
          <div className="flex items-center justify-between gap-3 border-b border-border-soft px-5 py-4">
            <Dialog.Title className="min-w-0 truncate text-h3 text-ink-900">{title}</Dialog.Title>
            <Dialog.Close aria-label={t.shell.close} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-olive-100"><X className="h-4 w-4" /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border-soft px-5 py-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
