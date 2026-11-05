import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, AlertCircle, Lock, Lightbulb } from "lucide-react";
import authImage from "@/assets/auth-residence.jpg";
import { cn } from "@/lib/utils";
import { t } from "@/lib/strings";
import { passwordScore } from "@/lib/validation";
import { Logo } from "./logo";
import { GlassCard, Skel } from "./primitives";

/* ---------- Layout ---------- */
export function AuthLayout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen w-full bg-outer md:p-3">
      <div className="relative grid min-h-screen w-full overflow-hidden bg-canvas md:min-h-[calc(100vh-1.5rem)] md:rounded-[28px] md:border md:border-surface-solid md:shadow-soft lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="flex min-w-0 flex-col px-5 py-6 sm:px-10 md:py-8">
          <Link to="/login" className="w-fit rounded-md text-ink-900" aria-label="Nestly — sign in">
            <Logo />
          </Link>
          <main className={cn("mx-auto flex w-full flex-1 flex-col justify-center py-8 animate-page-in", wide ? "max-w-2xl" : "max-w-md")}>{children}</main>
          <p className="text-[12px] text-ink-500">© 2026 Nestly · Made in South Africa</p>
        </div>
        <aside aria-hidden className="relative hidden p-3 lg:block">
          <div className="relative h-full overflow-hidden rounded-[22px]">
            <img src={authImage} alt="" width={1024} height={1280} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-olive-900/80 via-olive-900/10 to-transparent" />
            <div className="absolute inset-x-6 bottom-6 space-y-4 animate-rise" style={{ animationDelay: "200ms" }}>
              <h2 className="text-display text-on-dark">
                {t.auth.brandHeadline} <em className="font-light">{t.auth.brandAccent}</em>
              </h2>
              <p className="max-w-md text-[15px] text-on-dark-muted">{t.auth.brandBody}</p>
              <div className="glass max-w-md rounded-[22px] border-surface-solid/40 bg-surface-solid/20 p-4 text-on-dark">
                <p className="text-[14px]">{t.auth.brandQuote}</p>
                <p className="mt-1 text-[12px] text-on-dark-muted">{t.auth.brandQuoteBy}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function AuthHeading({ title, muted, sub }: { title: string; muted: string; sub?: ReactNode }) {
  return (
    <div className="mb-6 animate-rise">
      <h1 className="text-h1 text-ink-900">
        {title} <span className="text-ink-500">{muted}</span>.
      </h1>
      {sub && <p className="mt-2 text-[15px] text-ink-500">{sub}</p>}
    </div>
  );
}

/* ---------- Fields ---------- */
type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | undefined; hint?: string; trailing?: ReactNode };

export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField({ label, error, hint, trailing, className, id, ...rest }, ref) {
  const autoId = useId();
  const fid = id ?? autoId;
  const desc = error ? `${fid}-err` : hint ? `${fid}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={fid} className="block text-[14px] font-medium text-ink-900">{label}</label>
      <div className="relative">
        <input
          ref={ref}
          id={fid}
          aria-invalid={!!error}
          aria-describedby={desc}
          className={cn(
            "h-12 w-full rounded-[16px] border bg-surface-solid px-4 text-[15px] text-ink-900 outline-none transition placeholder:text-ink-500/70 focus:border-olive-700 focus:ring-3 focus:ring-olive-200",
            error ? "border-danger" : "border-input",
            trailing && "pr-12",
            className,
          )}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${fid}-err`} role="alert" className="flex items-center gap-1.5 text-[13px] text-danger">
          <AlertCircle aria-hidden className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${fid}-hint`} className="text-[12px] text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
});

export const PasswordField = forwardRef<HTMLInputElement, FieldProps>(function PasswordField(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      ref={ref}
      type={show ? "text" : "password"}
      trailing={
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t.auth.hide : t.auth.show} aria-pressed={show}
          className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-olive-100 hover:text-ink-900">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
      {...props}
    />
  );
});

export function StrengthMeter({ password }: { password: string }) {
  const score = passwordScore(password);
  const colors = ["bg-danger", "bg-danger", "bg-warning", "bg-olive-500", "bg-olive-700"];
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", password && score >= i ? colors[score] : "bg-olive-100")} />
        ))}
      </div>
      {password && (
        <p className="text-[12px] text-ink-500">
          {t.auth.strengthLabel}: <span className={cn("font-medium", score < 3 ? "text-danger" : "text-olive-700")}>{t.auth.strength[score]}</span>
        </p>
      )}
    </div>
  );
}

export function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[16px] border border-border-soft bg-olive-100/60 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[12px] text-ink-500">
        <Lock aria-hidden className="h-3 w-3" /> {label}
      </p>
      <p className="truncate text-[15px] font-medium text-ink-900" title={value}>{value}</p>
    </div>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-[16px] border border-danger/25 bg-danger/10 px-4 py-3 text-[14px] text-danger">
      <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function Checkbox({ label, error, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; error?: string | undefined }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-[14px] text-ink-900">
        <input id={id} type="checkbox" aria-invalid={!!error} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md accent-olive-700" {...rest} />
        <span>{label}</span>
      </label>
      {error && <p role="alert" className="pl-8 text-[13px] text-danger">{error}</p>}
    </div>
  );
}

export function DemoTips({ tips }: { tips: readonly string[] }) {
  return (
    <GlassCard hover={false} className="mt-6 p-4 shadow-none">
      <p className="mb-2 flex items-center gap-2 text-overline text-ink-500"><Lightbulb aria-hidden className="h-3.5 w-3.5" />{t.auth.demoTitle}</p>
      <ul className="space-y-1 text-[13px] text-ink-500">
        {tips.map((tip) => <li key={tip}>· {tip}</li>)}
      </ul>
    </GlassCard>
  );
}

export function LinkChecking() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label={t.auth.link.loading}>
      <Skel className="h-10 w-2/3" />
      <Skel className="h-4 w-full" />
      <Skel className="h-12 w-full" />
      <Skel className="h-12 w-full" />
      <Skel className="h-12 w-full" />
      <p className="text-[13px] text-ink-500">{t.auth.link.loading}</p>
    </div>
  );
}
