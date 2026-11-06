import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";
import { BILL_VIEWS, OwnerBilling, type BillSearch, type BillView } from "@/components/nestly/billing/OwnerBilling";
import { TenantBilling } from "@/components/nestly/billing/TenantBilling";
import { useAppState } from "@/lib/app-state";
import { roleCanSee } from "@/lib/nav";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";

export const Route = createFileRoute("/_shell/invoices")({
  head: () => pageHead("Invoices & payments", "Rent invoices, statements, payments, arrears, deposits and escalations in one place."),
  validateSearch: (s: Record<string, unknown>): BillSearch => ({
    view: BILL_VIEWS.includes(s["view"] as BillView) && s["view"] !== "invoices" ? (s["view"] as BillView) : undefined,
    id: typeof s["id"] === "string" && s["id"] ? s["id"] : undefined,
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { role } = useAppState();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/invoices" });
  const set = (p: Partial<BillSearch>, replace = true) => navigate({ search: (s: BillSearch) => ({ ...s, ...p }), replace });
  if (!roleCanSee(role, "invoices")) return <Placeholder navKey="invoices" title={t.bill.title} muted={t.bill.muted} />;
  if (role === "tenant") return <TenantBilling />;
  return <OwnerBilling view={search.view ?? "invoices"} id={search.id} set={set} />;
}
