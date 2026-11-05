import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";

export const Route = createFileRoute("/_shell/requests")({
  head: () => ({
    meta: [
      { title: "Requests — Nestly" },
      { name: "description", content: "Faults and upgrades logged by tenants in Nestly." },
      { property: "og:title", content: "Requests — Nestly" },
      { property: "og:description", content: "Faults and upgrades logged by tenants in Nestly." },
    ],
  }),
  component: () => <Placeholder navKey="requests" title="Requests &" muted="maintenance" sub="Faults and upgrades logged by tenants" />,
});
