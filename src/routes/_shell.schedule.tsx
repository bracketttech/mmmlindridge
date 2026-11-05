import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";

export const Route = createFileRoute("/_shell/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — Nestly" },
      { name: "description", content: "Inspections, viewings and repairs in Nestly." },
      { property: "og:title", content: "Schedule — Nestly" },
      { property: "og:description", content: "Inspections, viewings and repairs in Nestly." },
    ],
  }),
  component: () => <Placeholder navKey="schedule" title="Your" muted="schedule" sub="Inspections, viewings and repairs" />,
});
