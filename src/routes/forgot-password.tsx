import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Send, MailCheck } from "lucide-react";
import { z } from "zod";
import { AuthHeading, AuthLayout, TextField } from "@/components/nestly/auth";
import { PillButton } from "@/components/nestly/primitives";
import { forgotSchema } from "@/lib/validation";
import { authService } from "@/services/auth";
import { t } from "@/lib/strings";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/forgot-password")({
  head: () => pageHead("Forgot password", "Request a link to reset your Nestly password."),
  component: ForgotPage,
});

function ForgotPage() {
  const s = t.auth.forgot;
  const [sent, setSent] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema) });

  return (
    <AuthLayout>
      {sent ? (
        <div>
          <div className="mb-6 grid h-16 w-16 place-items-center rounded-full bg-olive-200 text-olive-900 animate-rise"><MailCheck className="h-7 w-7" aria-hidden /></div>
          <AuthHeading title={s.sentTitle} muted={s.sentMuted} sub={s.sentBody.replace("{email}", sent)} />
          <div className="flex flex-wrap gap-3">
            <Link to="/login" className="inline-flex h-12 items-center rounded-full bg-olive-700 px-6 text-sm font-medium text-primary-foreground hover:bg-olive-800">{s.back}</Link>
            <Link to="/reset-password" search={{ token: "demo-token" }} className="inline-flex h-12 items-center rounded-full border border-border-soft bg-surface-solid px-6 text-sm font-medium text-ink-900 hover:bg-olive-100">Open reset link (demo)</Link>
          </div>
        </div>
      ) : (
        <>
          <AuthHeading title={s.title} muted={s.muted} sub={s.sub} />
          <form noValidate className="space-y-4" onSubmit={handleSubmit(async (d) => { await authService.requestReset(d.email); setSent(d.email); })}>
            <TextField label={t.auth.email} type="email" autoComplete="email" placeholder={t.auth.emailPh} autoFocus error={errors.email?.message} {...register("email")} />
            <PillButton type="submit" size="lg" className="w-full" disabled={isSubmitting} icon={<Send className="h-4 w-4" />}>{isSubmitting ? "Sending…" : s.submit}</PillButton>
          </form>
          <Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-sm text-[14px] font-medium text-olive-700 hover:underline"><ArrowLeft className="h-4 w-4" />{s.back}</Link>
        </>
      )}
    </AuthLayout>
  );
}
