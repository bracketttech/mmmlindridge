import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";
import { SchedulePage } from "@/components/nestly/admin/SchedulePage";
import { useAppState } from "@/lib/app-state";
import { roleCanSee } from "@/lib/nav";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_shell/schedule")({
  head: () => pageHead("Schedule", "Inspections, maintenance visits and viewings on one calendar."),
  component: Page,
});

function Page() {
  const { role } = useAppState();
  if (!roleCanSee(role, "schedule")) return <Placeholder navKey="schedule" title={"Schedule"} />;
  return <SchedulePage />;
}
