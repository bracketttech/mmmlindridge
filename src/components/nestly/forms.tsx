import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const control = "w-full rounded-[5px] border bg-surface-solid px-4 text-[15px] text-ink-900 outline-none transition placeholder:text-ink-500/70 focus:border-olive-700 focus:ring-3 focus:ring-olive-200";

function FieldError({ id, error }: { id: string; error?: string | undefined }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-[13px] text-danger">
      <AlertCircle aria-hidden className="h-3.5 w-3.5 shrink-0" />{error}
    </p>
  );
}

export const SelectField = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string | undefined; children: ReactNode }>(
  function SelectField({ label, error, children, id, className, ...rest }, ref) {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <div className="min-w-0 space-y-1.5">
        <label htmlFor={fid} className="block text-[14px] font-medium text-ink-900">{label}</label>
        <select ref={ref} id={fid} aria-invalid={!!error} aria-describedby={error ? `${fid}-err` : undefined} className={cn(control, "h-12 pr-10", error ? "border-danger" : "border-input", className)} {...rest}>
          {children}
        </select>
        <FieldError id={`${fid}-err`} error={error} />
      </div>
    );
  },
);

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string | undefined; hint?: string }>(
  function TextAreaField({ label, error, hint, id, className, ...rest }, ref) {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <div className="min-w-0 space-y-1.5">
        <label htmlFor={fid} className="block text-[14px] font-medium text-ink-900">{label}</label>
        <textarea ref={ref} id={fid} rows={4} aria-invalid={!!error} className={cn(control, "min-h-24 resize-y py-3", error ? "border-danger" : "border-input", className)} {...rest} />
        {hint && !error && <p className="text-[12px] text-ink-500">{hint}</p>}
        <FieldError id={`${fid}-err`} error={error} />
      </div>
    );
  },
);

/** Accessible on/off switch row. */
export function ToggleRow({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 rounded-[5px] border border-border-soft bg-surface-solid px-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-[14px] font-medium text-ink-900">{label}</label>
        {hint && <p className="text-[12px] text-ink-500">{hint}</p>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-olive-700" : "bg-olive-200")}>
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-surface-solid shadow-soft transition-all", checked ? "left-6" : "left-1")} />
      </button>
    </div>
  );
}

/** Multi-select chips (e.g. amenities). */
export function ChipMultiSelect<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn("inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition-colors",
              on ? "border-olive-700 bg-olive-700 text-primary-foreground" : "border-border-soft bg-surface-solid text-ink-900 hover:bg-olive-100")}>
            {on && <Check aria-hidden className="h-3.5 w-3.5" />}{o.label}
          </button>
        );
      })}
    </div>
  );
}
