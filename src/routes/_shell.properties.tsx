import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";

export const Route = createFileRoute("/_shell/properties")({
  head: () => ({
    meta: [
      { title: "Properties — Nestly" },
      { name: "description", content: "Buildings, units and occupancy in Nestly." },
      { property: "og:title", content: "Properties — Nestly" },
      { property: "og:description", content: "Buildings, units and occupancy in Nestly." },
    ],
  }),
  component: () => <Placeholder navKey="properties" title="Your" muted="properties" sub="Buildings, units and occupancy" />,
});
