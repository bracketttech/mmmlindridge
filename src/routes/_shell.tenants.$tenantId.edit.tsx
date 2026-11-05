import { createFileRoute, Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { Placeholder } from "@/components/nestly/Placeholder";
import { EmptyState, GlassCard, PillButton, Skel } from "@/components/nestly/primitives";
import { TenantForm } from "@/components/nestly/tenants/TenantForm";
import { useCanManage } from "@/components/nestly/properties/shared";
import { tenantService } from "@/services";
import { useData } from "@/lib/use-data";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";

export const Route = createFileRoute("/_shell/tenants/$tenantId/edit")({
  head: () => pageHead("Edit tenant", "Update a tenant's details, unit, occupants and surety.", true),
  component: EditTenantPage,
});

function EditTenantPage() {
  const { tenantId } = Route.useParams();
  const canManage = useCanManage();
  const { data, loading, error, reload } = useData(() => tenantService.get(tenantId), [tenantId]);
  if (!canManage) return <Placeholder navKey="tenants" title={t.tenants.title} muted={t.tenants.muted} />;
  if (loading) return <div className="space-y-6"><Skel className="h-12 w-72" /><Skel className="h-[480px] rounded-[8.05px]" /></div>;
  if (error) return <GlassCard hover={false}><EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={reload}>{t.common.retry}</PillButton>} /></GlassCard>;
  if (!data) return <GlassCard hover={false}><EmptyState icon={<Users className="h-6 w-6" />} title={t.tenants.noResults} action={<Link to="/tenants" className="text-[14px] font-medium text-olive-700 underline">{t.tenants.all}</Link>} /></GlassCard>;
  return <TenantForm key={data.id} initial={data} />;
}
