import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";
import { ReportsPage } from "@/components/nestly/admin/ReportsPage";
import { useAppState } from "@/lib/app-state";
import { roleCanSee } from "@/lib/nav";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_shell/reports")({
  head: () => pageHead("Reports & insights", "Rent roll, arrears, income vs expenses, vacancy and turnover reports."),
  component: Page,
});

function Page() {
  const { role } = useAppState();
  if (!roleCanSee(role, "reports")) return <Placeholder navKey="reports" title={"Reports & insights"} />;
  return <ReportsPage />;
}
