import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { z } from "zod";
import { AuthHeading, AuthLayout, LinkChecking, LockedField, PasswordField, StrengthMeter, TextField } from "@/components/nestly/auth";
import { LinkStatusScreen } from "@/components/nestly/LinkStatusScreen";
import { PillButton } from "@/components/nestly/primitives";
import { authService } from "@/services/auth";
import type { InviteStatus, StaffInvite } from "@/mocks/auth";
import { useAppState } from "@/lib/app-state";
import { homeFor } from "@/lib/nav";
import { inviteSchema } from "@/lib/validation";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/invite/$token")({
  head: () => pageHead("Accept staff invite", "Accept your invitation to join a Nestly owner account.", true),
  component: InvitePage,
});

type Form = z.infer<typeof inviteSchema>;

function InvitePage() {
  const s = t.auth.invite;
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { setRole } = useAppState();
  const [state, setState] = useState<{ status: InviteStatus | "loading"; invite?: StaffInvite }>({ status: "loading" });
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(inviteSchema), mode: "onTouched" });

  useEffect(() => {
    setState({ status: "loading" });
    authService.getStaffInvite(token).then(setState);
  }, [token]);

  const onSubmit = async (d: Form) => {
    const session = await authService.acceptStaffInvite(state.invite!, d.name);
    setRole(session.role);
    navigate({ to: homeFor(session.role), replace: true });
  };

  return (
    <AuthLayout>
      {state.status === "loading" ? <LinkChecking /> : state.status !== "valid" ? <LinkStatusScreen status={state.status} /> : (
        <>
          <AuthHeading title={s.title} muted={s.muted} sub={s.sub.replace("{owner}", state.invite!.ownerName).replace("{role}", t.roles[state.invite!.role])} />
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <LockedField label={t.auth.email} value={state.invite!.email} />
            <LockedField label="Role" value={t.roles[state.invite!.role]} />
            <LockedField label={s.invitedBy} value={state.invite!.invitedBy} />
            <LockedField label={s.expires} value={formatDate(state.invite!.expiresAt)} />
          </div>
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <TextField label={t.auth.fullName} autoComplete="name" autoFocus error={errors.name?.message} {...register("name")} />
            <TextField label={t.auth.phone} type="tel" autoComplete="tel" placeholder={t.auth.phonePh} error={errors.phone?.message} {...register("phone")} />
            <PasswordField label={t.auth.password} autoComplete="new-password" error={errors.password?.message} {...register("password")} />
            <StrengthMeter password={watch("password") ?? ""} />
            <PasswordField label={t.auth.confirmPassword} autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
            <PillButton type="submit" size="lg" className="w-full" disabled={isSubmitting} icon={<ArrowRight className="h-4 w-4" />}>{isSubmitting ? "Creating account…" : s.submit}</PillButton>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
