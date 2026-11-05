import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";
import { PropertyForm } from "@/components/nestly/properties/PropertyForm";
import { useCanManage } from "@/components/nestly/properties/shared";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";

export const Route = createFileRoute("/_shell/properties/new")({
  head: () => pageHead("Add property", "Add a building to your portfolio in six short steps.", true),
  component: NewPropertyPage,
});

function NewPropertyPage() {
  const canManage = useCanManage();
  if (!canManage) return <Placeholder navKey="properties" title={t.props.title} muted={t.props.muted} />;
  return <PropertyForm />;
}
