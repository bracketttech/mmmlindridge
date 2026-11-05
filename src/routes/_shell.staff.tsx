import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";

export const Route = createFileRoute("/_shell/staff")({
  head: () => ({
    meta: [
      { title: "Staff & permissions — Nestly" },
      { name: "description", content: "Caretakers, agents, finance and legal in Nestly." },
      { property: "og:title", content: "Staff & permissions — Nestly" },
      { property: "og:description", content: "Caretakers, agents, finance and legal in Nestly." },
    ],
  }),
  component: () => <Placeholder navKey="staff" title="Staff &" muted="permissions" sub="Caretakers, agents, finance and legal" />,
});
