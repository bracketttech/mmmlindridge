import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Lock } from "lucide-react";
import { z } from "zod";
import { AuthHeading, AuthLayout, Checkbox, LinkChecking, LockedField, PasswordField, StrengthMeter, TextField } from "@/components/nestly/auth";
import { LinkStatusScreen } from "@/components/nestly/LinkStatusScreen";
import { GlassCard, PillButton } from "@/components/nestly/primitives";
import { authService } from "@/services/auth";
import type { InviteStatus, TenantLink } from "@/mocks/auth";
import { useAppState } from "@/lib/app-state";
import { homeFor } from "@/lib/nav";
import { tenantRegisterSchema } from "@/lib/validation";
import { formatDate, formatZAR } from "@/lib/format";
import { t } from "@/lib/strings";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/register/$token")({
  head: () => pageHead("Tenant registration", "Register as a tenant for your new home on Nestly.", true),
  component: RegisterPage,
});

type Form = z.infer<typeof tenantRegisterSchema>;

function RegisterPage() {
  const s = t.auth.register;
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { setRole } = useAppState();
  const [state, setState] = useState<{ status: InviteStatus | "loading"; link?: TenantLink }>({ status: "loading" });
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(tenantRegisterSchema), mode: "onTouched" });

  useEffect(() => {
    setState({ status: "loading" });
    authService.getTenantLink(token).then((r) => {
      setState(r);
      if (r.link) reset({ phone: r.link.phone });
    });
  }, [token, reset]);

  const link = state.link;
  const onSubmit = async () => {
    const session = await authService.registerTenant(link!);
    setRole(session.role);
    navigate({ to: homeFor(session.role), replace: true });
  };

  return (
    <AuthLayout>
      {state.status === "loading" ? <LinkChecking /> : state.status !== "valid" || !link ? <LinkStatusScreen status={state.status === "valid" ? "invalid" : state.status} /> : (
        <>
          <AuthHeading title={s.title} muted={s.muted} sub={s.sub} />
          <GlassCard hover={false} className="mb-5 space-y-3 p-4">
            <p className="flex items-center gap-2 text-overline text-ink-500"><Lock aria-hidden className="h-3.5 w-3.5" />{s.captured}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <LockedField label={t.auth.fullName} value={link.name} />
              <LockedField label={t.auth.email} value={link.email} />
              <LockedField label={s.property} value={`${link.propertyName}, ${link.propertyAddress}`} />
              <LockedField label={s.unit} value={link.unit} />
              <LockedField label={s.rent} value={formatZAR(link.rent)} />
              <LockedField label={s.leaseStart} value={formatDate(link.leaseStart)} />
            </div>
            <p className="text-[12px] text-ink-500">{s.lockedHint}</p>
          </GlassCard>
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <TextField label={t.auth.phone} type="tel" autoComplete="tel" error={errors.phone?.message} {...register("phone")} />
            <PasswordField label={t.auth.password} autoComplete="new-password" autoFocus error={errors.password?.message} {...register("password")} />
            <StrengthMeter password={watch("password") ?? ""} />
            <PasswordField label={t.auth.confirmPassword} autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
            <Checkbox label={t.auth.signup.terms} error={errors.terms?.message} {...register("terms")} />
            <PillButton type="submit" size="lg" className="w-full" disabled={isSubmitting} icon={<ArrowRight className="h-4 w-4" />}>{isSubmitting ? "Creating account…" : s.submit}</PillButton>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
