import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { AuthHeading, AuthLayout, Checkbox, FormAlert, PasswordField, StrengthMeter, TextField } from "@/components/nestly/auth";
import { PillButton } from "@/components/nestly/primitives";
import { signupSchema, type SignupInput } from "@/lib/validation";
import { authService, AuthError } from "@/services/auth";
import { t } from "@/lib/strings";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/signup")({
  head: () => pageHead("Create an owner account", "Create your Nestly owner account and start managing your rental properties."),
  component: SignupPage,
});

function SignupPage() {
  const s = t.auth.signup;
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<SignupInput>({ resolver: zodResolver(signupSchema), mode: "onTouched" });
  const pw = watch("password") ?? "";

  const onSubmit = async (d: SignupInput) => {
    setFormError(null);
    try {
      await authService.signup(d.email);
      navigate({ to: "/verify-email", search: { email: d.email, name: d.name } });
    } catch (e) {
      if (e instanceof AuthError) setFormError(s.taken);
    }
  };

  return (
    <AuthLayout>
      <AuthHeading title={s.title} muted={s.muted} sub={s.sub} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 animate-rise" style={{ animationDelay: "80ms" }}>
        {formError && <FormAlert>{formError}</FormAlert>}
        <TextField label={t.auth.fullName} autoComplete="name" autoFocus error={errors.name?.message} {...register("name")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={t.auth.email} type="email" autoComplete="email" placeholder={t.auth.emailPh} error={errors.email?.message} {...register("email")} />
          <TextField label={t.auth.phone} type="tel" autoComplete="tel" placeholder={t.auth.phonePh} error={errors.phone?.message} {...register("phone")} />
        </div>
        <PasswordField label={t.auth.password} autoComplete="new-password" error={errors.password?.message} {...register("password")} />
        <StrengthMeter password={pw} />
        <PasswordField label={t.auth.confirmPassword} autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
        <Checkbox label={s.terms} error={errors.terms?.message} {...register("terms")} />
        <PillButton type="submit" size="lg" className="w-full" disabled={isSubmitting} icon={<ArrowRight className="h-4 w-4" />}>
          {isSubmitting ? "Creating account…" : s.submit}
        </PillButton>
      </form>
      <p className="mt-6 text-[14px] text-ink-500">
        {s.haveAccount} <Link to="/login" className="rounded-sm font-medium text-olive-700 hover:underline">{s.signin}</Link>
      </p>
    </AuthLayout>
  );
}
