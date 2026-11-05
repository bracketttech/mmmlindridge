import { Link } from "@tanstack/react-router";
import { Hourglass, Lock } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { roleCanSee, type NavKey } from "@/lib/nav";
import { t } from "@/lib/strings";
import { GlassCard, PageHeader, EmptyState } from "./primitives";

export function Placeholder({ navKey, title, muted, sub }: { navKey: NavKey; title: string; muted?: string; sub?: string }) {
  const { role } = useAppState();
  const allowed = roleCanSee(role, navKey);
  return (
    <div className="space-y-6">
      <PageHeader title={title} muted={muted} sub={sub} />
      <GlassCard hover={false} className="animate-rise" style={{ animationDelay: "140ms" }}>
        {allowed ? (
          <EmptyState icon={<Hourglass className="h-6 w-6" />} title={t.placeholder.title} body={t.placeholder.body} />
        ) : (
          <EmptyState icon={<Lock className="h-6 w-6" />} title={t.placeholder.notForRole} body={t.placeholder.notForRoleBody}
            action={<Link to="/dashboard" className="inline-flex h-10 items-center rounded-full bg-olive-700 px-5 text-sm font-medium text-primary-foreground">{t.placeholder.backHome}</Link>} />
        )}
      </GlassCard>
    </div>
  );
}
