import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TimerOff } from "lucide-react";
import { AuthHeading, AuthLayout } from "@/components/nestly/auth";
import { clearSession } from "@/lib/session";
import { t } from "@/lib/strings";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/session-expired")({
  head: () => pageHead("Session expired", "Your Nestly session has ended. Sign in again to continue.", true),
  component: ExpiredPage,
});

function ExpiredPage() {
  const s = t.auth.expired;
  useEffect(() => clearSession(), []);
  return (
    <AuthLayout>
      <div className="mb-6 grid h-16 w-16 place-items-center rounded-full bg-warning/15 text-warning-ink animate-rise"><TimerOff className="h-7 w-7" aria-hidden /></div>
      <AuthHeading title={s.title} muted={s.muted} sub={s.body} />
      <Link to="/login" className="inline-flex h-12 items-center rounded-full bg-olive-700 px-6 text-sm font-medium text-primary-foreground hover:bg-olive-800">{s.cta}</Link>
    </AuthLayout>
  );
}
