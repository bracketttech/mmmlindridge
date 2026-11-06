import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";
import { StaffPage } from "@/components/nestly/admin/StaffPage";
import { useAppState } from "@/lib/app-state";
import { roleCanSee } from "@/lib/nav";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_shell/staff")({
  head: () => pageHead("Staff & permissions", "Invite staff, set property access and edit the permission matrix."),
  component: Page,
});

function Page() {
  const { role } = useAppState();
  if (!roleCanSee(role, "staff")) return <Placeholder navKey="staff" title={"Staff & permissions"} />;
  return <StaffPage />;
}
