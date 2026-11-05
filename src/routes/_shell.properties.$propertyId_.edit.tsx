import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { Placeholder } from "@/components/nestly/Placeholder";
import { EmptyState, GlassCard, PillButton, Skel } from "@/components/nestly/primitives";
import { PropertyForm } from "@/components/nestly/properties/PropertyForm";
import { useCanManage } from "@/components/nestly/properties/shared";
import { propertyService } from "@/services";
import { useData } from "@/lib/use-data";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";

export const Route = createFileRoute("/_shell/properties/$propertyId_/edit")({
  head: () => pageHead("Edit property", "Update a property's details, photos, amenities and rules.", true),
  component: EditPropertyPage,
});

function EditPropertyPage() {
  const { propertyId } = Route.useParams();
  const canManage = useCanManage();
  const { data, loading, error, reload } = useData(() => propertyService.get(propertyId), [propertyId]);
  if (!canManage) return <Placeholder navKey="properties" title={t.props.title} muted={t.props.muted} />;
  if (loading) return <div className="space-y-6"><Skel className="h-12 w-72" /><Skel className="h-[480px] rounded-[8.05px]" /></div>;
  if (error) return <GlassCard hover={false}><EmptyState tone="error" title={t.common.errorTitle} body={t.common.errorBody} action={<PillButton variant="secondary" onClick={reload}>{t.common.retry}</PillButton>} /></GlassCard>;
  if (!data) return <GlassCard hover={false}><EmptyState icon={<Building2 className="h-6 w-6" />} title={t.props.notFound} body={t.props.notFoundBody} action={<Link to="/properties" className="text-[14px] font-medium text-olive-700 underline">{t.props.back}</Link>} /></GlassCard>;
  return <PropertyForm key={data.id} initial={data} />;
}
