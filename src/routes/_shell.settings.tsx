import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SETTINGS_VIEWS, SettingsPage, type SettingsView } from "@/components/nestly/admin/SettingsPage";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_shell/settings")({
  head: () => pageHead("Settings", "Profile, notifications, company branding, subscription and audit log."),
  validateSearch: (s: Record<string, unknown>): { view?: SettingsView | undefined } => ({ view: SETTINGS_VIEWS.includes(s["view"] as SettingsView) && s["view"] !== "profile" ? (s["view"] as SettingsView) : undefined }),
  component: Page,
});

function Page() {
  const { view } = Route.useSearch();
  const navigate = useNavigate({ from: "/settings" });
  return <SettingsPage view={view ?? "profile"} setView={(v) => navigate({ search: { view: v === "profile" ? undefined : v }, replace: true })} />;
}
