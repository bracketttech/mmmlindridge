import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";
import { AnnouncementsPage } from "@/components/nestly/admin/AnnouncementsPage";
import { useAppState } from "@/lib/app-state";
import { roleCanSee } from "@/lib/nav";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_shell/announcements")({
  head: () => pageHead("Announcements", "Compose, schedule and track tenant announcements and the notice board."),
  component: Page,
});

function Page() {
  const { role } = useAppState();
  if (!roleCanSee(role, "announcements")) return <Placeholder navKey="announcements" title={"Announcements"} />;
  return <AnnouncementsPage />;
}
