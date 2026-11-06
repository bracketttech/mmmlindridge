import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/nestly/logo";

/** Mobile-first frame for no-login pages opened from a secure link (signing, applications). */
export function PublicLayout({ children, badge }: { children: ReactNode; badge?: string | undefined }) {
  return (
    <div className="min-h-screen w-full bg-outer md:p-3">
      <div className="flex min-h-screen w-full flex-col bg-canvas md:min-h-[calc(100vh-1.5rem)] md:rounded-[9.2px] md:border md:border-surface-solid md:shadow-soft">
        <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-4 text-ink-900 sm:px-6 md:py-6">
          <Logo />
          {badge && <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-surface-solid/80 px-3 py-1.5 text-[12px] font-medium text-olive-900 shadow-soft"><ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="truncate">{badge}</span></span>}
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10 animate-page-in sm:px-6">{children}</main>
        <p className="mx-auto w-full max-w-3xl px-4 pb-6 text-[12px] text-ink-500 sm:px-6">© 2026 Nestly · Made in South Africa</p>
      </div>
    </div>
  );
}
