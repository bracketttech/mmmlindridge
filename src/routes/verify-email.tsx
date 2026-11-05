import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MailOpen, ArrowRight, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { AuthHeading, AuthLayout } from "@/components/nestly/auth";
import { PillButton } from "@/components/nestly/primitives";
import { authService } from "@/services/auth";
import { useAppState } from "@/lib/app-state";
import { t } from "@/lib/strings";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s: Record<string, unknown>) => ({
    email: typeof s.email === "string" ? s.email : "",
    name: typeof s.name === "string" ? s.name : "",
  }),
  head: () => pageHead("Verify your email", "Confirm your email address to activate your Nestly account.", true),
  component: VerifyPage,
});

function VerifyPage() {
  const s = t.auth.verify;
  const { email, name } = Route.useSearch();
  const navigate = useNavigate();
  const { setRole } = useAppState();
  const [cooldown, setCooldown] = useState(30);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const shown = email || "your inbox";
  return (
    <AuthLayout>
      <div className="mb-6 grid h-16 w-16 place-items-center rounded-full bg-olive-200 text-olive-900 animate-rise"><MailOpen className="h-7 w-7" aria-hidden /></div>
      <AuthHeading title={s.title} muted={s.muted} sub={<>{s.body.split("{email}")[0]}<strong className="font-medium text-ink-900 break-all">{shown}</strong>{s.body.split("{email}")[1]}</>} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <PillButton size="lg" disabled={busy} icon={<ArrowRight className="h-4 w-4" />} onClick={async () => {
          setBusy(true);
          await authService.confirmEmail(email || "owner@nestly.co.za", name || undefined);
          setRole("owner");
          navigate({ to: "/onboarding", replace: true });
        }}>{s.demoContinue}</PillButton>
        <PillButton size="lg" variant="secondary" disabled={cooldown > 0} icon={<RotateCw className="h-4 w-4" />} onClick={async () => {
          await authService.resendVerification();
          toast.success(s.resent);
          setCooldown(30);
        }}>
          <span aria-live="polite">{cooldown > 0 ? s.resendIn.replace("{s}", String(cooldown)) : s.resend}</span>
        </PillButton>
      </div>
      <Link to="/signup" className="mt-6 inline-block rounded-sm text-[14px] font-medium text-olive-700 hover:underline">{s.wrongEmail}</Link>
    </AuthLayout>
  );
}
