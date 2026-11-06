import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";
import { APP_VIEWS, OwnerApplications, type AppSearch, type AppViewKey } from "@/components/nestly/applications/OwnerApplications";
import { useAppState } from "@/lib/app-state";
import { roleCanSee } from "@/lib/nav";
import { pageHead } from "@/lib/seo";
import { t } from "@/lib/strings";

export const Route = createFileRoute("/_shell/applications")({
  head: () => pageHead("Applications & screening", "Vacancies, enquiries, viewings, applicants and the owner screening checklist."),
  validateSearch: (s: Record<string, unknown>): AppSearch => ({
    view: APP_VIEWS.includes(s["view"] as AppViewKey) && s["view"] !== "pipeline" ? (s["view"] as AppViewKey) : undefined,
    id: typeof s["id"] === "string" && s["id"] ? s["id"] : undefined,
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const { role } = useAppState();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/applications" });
  if (!roleCanSee(role, "applications")) return <Placeholder navKey="applications" title={t.apps.title} muted={t.apps.muted} />;
  return <OwnerApplications view={search.view ?? "pipeline"} id={search.id} set={(p, replace = true) => navigate({ search: (s: AppSearch) => ({ ...s, ...p }), replace })} />;
}
