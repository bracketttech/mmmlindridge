import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AuthHeading, AuthLayout, FormAlert } from "@/components/nestly/auth";
import { PillButton } from "@/components/nestly/primitives";
import { authService, AuthError } from "@/services/auth";
import { useAppState } from "@/lib/app-state";
import { ROLES, homeFor, type Role } from "@/lib/nav";
import { otpSchema } from "@/lib/validation";
import { t } from "@/lib/strings";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/two-factor")({
  validateSearch: (s: Record<string, unknown>) => ({
    email: typeof s.email === "string" ? s.email : "",
    role: (ROLES as string[]).includes(String(s.role)) ? (s.role as Role) : ("owner" as Role),
  }),
  head: () => pageHead("Two-step verification", "Enter your verification code to finish signing in to Nestly.", true),
  component: OtpPage,
});

function OtpPage() {
  const s = t.auth.otp;
  const { email, role } = Route.useSearch();
  const navigate = useNavigate();
  const { setRole } = useAppState();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const parsed = otpSchema.safeParse({ code });
    if (!parsed.success) return setError(parsed.error.issues[0]!.message);
    setBusy(true);
    setError(null);
    try {
      const session = await authService.verifyOtp(code, email, role);
      setRole(session.role);
      navigate({ to: homeFor(session.role), replace: true });
    } catch (err) {
      if (err instanceof AuthError) setError(s.invalid);
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6 grid h-16 w-16 place-items-center rounded-full bg-olive-200 text-olive-900 animate-rise"><ShieldCheck className="h-7 w-7" aria-hidden /></div>
      <AuthHeading title={s.title} muted={s.muted} sub={s.sub} />
      <form onSubmit={submit} noValidate className="space-y-5">
        {error && <FormAlert>{error}</FormAlert>}
        <div className="space-y-2">
          <label htmlFor="otp" className="block text-[14px] font-medium text-ink-900">{s.label}</label>
          <InputOTP id="otp" maxLength={6} value={code} onChange={setCode} autoFocus inputMode="numeric" aria-invalid={!!error} containerClassName="gap-2">
            <InputOTPGroup className="gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} className="h-14 w-11 rounded-[14px] border border-input bg-surface-solid text-[20px] first:rounded-[14px] last:rounded-[14px] sm:w-12" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <PillButton type="submit" size="lg" className="w-full" disabled={busy} icon={<ArrowRight className="h-4 w-4" />}>{busy ? "Verifying…" : s.submit}</PillButton>
      </form>
      <div className="mt-6 flex flex-wrap gap-4 text-[14px]">
        <button type="button" onClick={() => toast.success(s.sent)} className="rounded-sm font-medium text-olive-700 hover:underline">{s.resend}</button>
        <Link to="/login" className="rounded-sm text-ink-500 hover:underline">{t.auth.forgot.back}</Link>
      </div>
    </AuthLayout>
  );
}
