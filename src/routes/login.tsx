import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { AuthHeading, AuthLayout, Checkbox, DemoTips, FormAlert, PasswordField, TextField } from "@/components/nestly/auth";
import { PillButton, SegmentedChips } from "@/components/nestly/primitives";
import { loginSchema, type LoginInput } from "@/lib/validation";
import { authService, AuthError } from "@/services/auth";
import { useAppState } from "@/lib/app-state";
import { ROLES, homeFor, type Role } from "@/lib/nav";
import { t } from "@/lib/strings";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  head: () => pageHead("Sign in", "Sign in to Nestly to manage your properties, tenants and rent."),
  component: LoginPage,
});

function LoginPage() {
  const s = t.auth.login;
  const navigate = useNavigate();
  const { role, setRole } = useAppState();
  const [asRole, setAsRole] = useState<Role>(role);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { remember: true } });

  const onSubmit = async (d: LoginInput) => {
    setFormError(null);
    try {
      const r = await authService.login(d.email, d.password, asRole);
      if (r.status === "2fa") return navigate({ to: "/two-factor", search: { email: r.email, role: r.role } });
      setRole(r.session.role);
      navigate({ to: homeFor(r.session.role), replace: true });
    } catch (e) {
      if (e instanceof AuthError) setFormError(s.invalid);
    }
  };

  return (
    <AuthLayout>
      <AuthHeading title={s.title} muted={s.muted} sub={s.sub} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 animate-rise" style={{ animationDelay: "80ms" }}>
        {formError && <FormAlert>{formError}</FormAlert>}
        <TextField label={t.auth.email} type="email" autoComplete="email" placeholder={t.auth.emailPh} autoFocus error={errors.email?.message} {...register("email")} />
        <PasswordField label={t.auth.password} autoComplete="current-password" placeholder={t.auth.passwordPh} error={errors.password?.message} {...register("password")} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Checkbox label={t.auth.remember} {...register("remember")} />
          <Link to="/forgot-password" className="rounded-sm text-[14px] font-medium text-olive-700 hover:underline">{s.forgot}</Link>
        </div>
        <div className="space-y-2 pt-1">
          <p className="text-overline text-ink-500" id="role-label">{s.roleLabel}</p>
          <SegmentedChips wrap label={s.roleLabel} value={asRole} onChange={setAsRole} options={ROLES.map((r) => ({ value: r, label: t.roles[r].split(" /")[0]! }))} />
        </div>
        <PillButton type="submit" size="lg" className="w-full" disabled={isSubmitting} icon={<ArrowRight className="h-4 w-4" />}>
          {isSubmitting ? "Signing in…" : s.submit}
        </PillButton>
      </form>
      <p className="mt-6 text-[14px] text-ink-500">
        {s.noAccount}{" "}
        <Link to="/signup" className="rounded-sm font-medium text-olive-700 hover:underline">{s.signup}</Link>
      </p>
      <DemoTips tips={t.auth.demoTips} />
    </AuthLayout>
  );
}
