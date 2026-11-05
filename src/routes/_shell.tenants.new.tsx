import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";
import { TenantForm } from "@/components/nestly/tenants/TenantForm";
import { useCanManage } from "@/components/nestly/properties/shared";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";

export const Route = createFileRoute("/_shell/tenants/new")({
  head: () => pageHead("Add tenant", "Load a tenant, assign a unit and send their registration link.", true),
  component: NewTenantPage,
});

function NewTenantPage() {
  if (!useCanManage()) return <Placeholder navKey="tenants" title={t.tenants.title} muted={t.tenants.muted} />;
  return <TenantForm />;
}
