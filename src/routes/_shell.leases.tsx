import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";
import { LEASE_VIEWS, OwnerLeases, type LeaseSearch, type LeaseViewKey } from "@/components/nestly/leasing/OwnerLeases";
import { TenantLeases } from "@/components/nestly/leasing/TenantLeases";
import { useAppState } from "@/lib/app-state";
import { roleCanSee } from "@/lib/nav";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";

export const Route = createFileRoute("/_shell/leases")({
  head: () => pageHead("Leases & documents", "Leases, renewals, e-signatures, lease templates and inspection reports in one place."),
  validateSearch: (s: Record<string, unknown>): LeaseSearch => ({
    view: LEASE_VIEWS.includes(s["view"] as LeaseViewKey) && s["view"] !== "leases" ? (s["view"] as LeaseViewKey) : undefined,
    id: typeof s["id"] === "string" && s["id"] ? s["id"] : undefined,
  }),
  component: LeasesPage,
});

function LeasesPage() {
  const { role } = useAppState();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/leases" });
  const set = (p: Partial<LeaseSearch>, replace = true) => navigate({ search: (s: LeaseSearch) => ({ ...s, ...p }), replace });
  if (!roleCanSee(role, "leases")) return <Placeholder navKey="leases" title={t.lease.title} muted={t.lease.muted} />;
  if (role === "tenant") return <TenantLeases />;
  return <OwnerLeases view={search.view ?? "leases"} id={search.id} set={set} />;
}
