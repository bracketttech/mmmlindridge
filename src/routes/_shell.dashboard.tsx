import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";
import { useAppState } from "@/lib/app-state";
import { t } from "@/lib/strings";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => pageHead("Home", "Your Nestly home: portfolio, rent and requests at a glance."),
  component: Home,
});

function Home() {
  const { role } = useAppState();
  const h = t.home[role];
  return <Placeholder navKey="dashboard" title={h.title} muted={h.muted} sub={h.sub} />;
}
