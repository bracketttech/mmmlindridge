import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Wrench, CreditCard } from "lucide-react";
import { Placeholder } from "@/components/nestly/Placeholder";
import { DashboardBody, DashboardSkeleton } from "@/components/nestly/dashboard";
import { PageHeader, PillButton, EmptyState, GlassCard } from "@/components/nestly/primitives";
import { dashboardService, type DashboardData } from "@/services";
import { useAppState } from "@/lib/app-state";
import { readSession } from "@/lib/session";
import { t } from "@/lib/strings";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => pageHead("Home", "Your Nestly home: portfolio, rent and requests at a glance."),
  component: Home,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning," : h < 18 ? "Good afternoon," : "Good evening,";
}

function Home() {
  const { role, propertyId } = useAppState();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [first, setFirst] = useState("Janice");

  useEffect(() => {
    const s = readSession();
    if (s) setFirst(s.name.split(" ")[0]!);
  }, []);

  const load = () => {
    setLoading(true);
    setError(false);
    dashboardService.get(propertyId).then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(load, [propertyId]);

  if (role === "tenant") {
    const h = t.home.tenant;
    return <Placeholder navKey="dashboard" title={h.title} muted={h.muted} sub={h.sub} />;
  }
  const h = t.home[role];
  const title = role === "owner" ? greeting() : h.title;
  const muted = role === "owner" ? first : h.muted;
  const sub = data ? `${h.sub.split(" · ")[0]} · ${data.propertyId === "all" ? t.shell.allProperties : data.featured.name} · ${data.rent.rate}% rent collected this month` : h.sub;

  return (
    <div className="space-y-6">
      <PageHeader title={title} muted={muted} sub={sub}
        actions={
          <>
            <Link to="/requests"><PillButton variant="secondary" tabIndex={-1} icon={<Wrench className="h-4 w-4" />}>Requests</PillButton></Link>
            <Link to="/invoices"><PillButton tabIndex={-1} icon={<CreditCard className="h-4 w-4" />}>Invoices</PillButton></Link>
          </>
        } />
      {error ? (
        <GlassCard hover={false}><EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={load}>{t.common.retry}</PillButton>} /></GlassCard>
      ) : !data ? (
        <DashboardSkeleton />
      ) : (
        <div className={cn("transition-opacity duration-300", loading && "opacity-60")} aria-busy={loading}>
          <DashboardBody role={role} data={data} />
        </div>
      )}
    </div>
  );
}
