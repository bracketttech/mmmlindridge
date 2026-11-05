import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Nestly" },
      { name: "description", content: "Your portfolio at a glance in Nestly." },
      { property: "og:title", content: "Dashboard — Nestly" },
      { property: "og:description", content: "Your portfolio at a glance in Nestly." },
    ],
  }),
  component: () => <Placeholder navKey="dashboard" title="Good afternoon," muted="Janice" sub="Your portfolio at a glance" />,
});
