import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";

export const Route = createFileRoute("/_shell/legal")({
  head: () => ({
    meta: [
      { title: "Legal & notices — Nestly" },
      { name: "description", content: "Notices, breaches and legal steps in Nestly." },
      { property: "og:title", content: "Legal & notices — Nestly" },
      { property: "og:description", content: "Notices, breaches and legal steps in Nestly." },
    ],
  }),
  component: () => <Placeholder navKey="legal" title="Legal &" muted="notices" sub="Notices, breaches and legal steps" />,
});
