import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { z } from "zod";
import { AuthHeading, AuthLayout, PasswordField, StrengthMeter } from "@/components/nestly/auth";
import { PillButton, SuccessCheck } from "@/components/nestly/primitives";
import { resetSchema } from "@/lib/validation";
import { authService, AuthError } from "@/services/auth";
import { t } from "@/lib/strings";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s["token"] === "string" ? s["token"] : "" }),
  head: () => pageHead("Reset password", "Choose a new password for your Nestly account.", true),
  component: ResetPage,
});

type Form = z.infer<typeof resetSchema>;

function ResetPage() {
  const s = t.auth.reset;
  const { token } = Route.useSearch();
  const [state, setState] = useState<"form" | "done" | "expired">(token ? "form" : "expired");
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(resetSchema), mode: "onTouched" });

  const onSubmit = async (d: Form) => {
    try {
      await authService.resetPassword(token, d.password);
      setState("done");
    } catch (e) {
      if (e instanceof AuthError) setState("expired");
    }
  };

  return (
    <AuthLayout>
      {state === "expired" ? (
        <div>
          <AuthHeading title={s.expiredTitle} muted={s.expiredMuted} sub={s.expiredBody} />
          <Link to="/forgot-password" className="inline-flex h-12 items-center rounded-full bg-olive-700 px-6 text-sm font-medium text-primary-foreground hover:bg-olive-800">{s.requestNew}</Link>
        </div>
      ) : state === "done" ? (
        <div className="flex flex-col items-center text-center">
          <SuccessCheck />
          <div className="mt-6"><AuthHeading title={s.doneTitle} muted={s.doneMuted} sub={s.doneBody} /></div>
          <Link to="/login" className="inline-flex h-12 items-center rounded-full bg-olive-700 px-6 text-sm font-medium text-primary-foreground hover:bg-olive-800">{t.auth.login.submit}</Link>
        </div>
      ) : (
        <>
          <AuthHeading title={s.title} muted={s.muted} sub={s.sub} />
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <PasswordField label={t.auth.newPassword} autoComplete="new-password" autoFocus error={errors.password?.message} {...register("password")} />
            <StrengthMeter password={watch("password") ?? ""} />
            <PasswordField label={t.auth.confirmPassword} autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
            <PillButton type="submit" size="lg" className="w-full" disabled={isSubmitting} icon={<Check className="h-4 w-4" />}>{isSubmitting ? "Updating…" : s.submit}</PillButton>
          </form>
          <p className="mt-4 text-[12px] text-ink-500">Demo: open /reset-password?token=expired to see the expired-link state.</p>
        </>
      )}
    </AuthLayout>
  );
}
