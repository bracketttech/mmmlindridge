import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";

export const Route = createFileRoute("/_shell/tenants")({
  head: () => ({
    meta: [
      { title: "Tenants — Nestly" },
      { name: "description", content: "Everyone renting from you in Nestly." },
      { property: "og:title", content: "Tenants — Nestly" },
      { property: "og:description", content: "Everyone renting from you in Nestly." },
    ],
  }),
  component: () => <Placeholder navKey="tenants" title="Tenants &" muted="units" sub="Everyone renting from you" />,
});
