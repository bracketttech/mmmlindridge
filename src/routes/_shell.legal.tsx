import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";
import { LegalPage } from "@/components/nestly/admin/LegalPage";
import { useAppState } from "@/lib/app-state";
import { roleCanSee } from "@/lib/nav";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_shell/legal")({
  head: () => pageHead("Legal & notices", "Notice templates, delivery tracking and the lawful eviction pipeline."),
  component: Page,
});

function Page() {
  const { role } = useAppState();
  if (!roleCanSee(role, "legal")) return <Placeholder navKey="legal" title={"Legal & notices"} />;
  return <LegalPage />;
}
