import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Nestly" },
      { name: "description", content: "Business details, billing and preferences in Nestly." },
      { property: "og:title", content: "Settings — Nestly" },
      { property: "og:description", content: "Business details, billing and preferences in Nestly." },
    ],
  }),
  component: () => <Placeholder navKey="settings" title="Account" muted="settings" sub="Business details, billing and preferences" />,
});
