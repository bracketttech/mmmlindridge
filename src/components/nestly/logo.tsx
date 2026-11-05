import { t } from "@/lib/strings";

export function Logo({ showText = true }: { showText?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 28 28" className="h-7 w-7 shrink-0" aria-hidden>
        <path d="M7 3l5 5-5 5-5-5zM21 3l5 5-5 5-5-5zM14 10l5 5-5 5-5-5zM7 17l5 5-5 5-5-5z" fill="currentColor" />
      </svg>
      {showText && (
        <span className="text-[20px] font-medium tracking-tight">
          {t.app.name}
          <sup className="text-[9px]">™</sup>
        </span>
      )}
    </div>
  );
}
