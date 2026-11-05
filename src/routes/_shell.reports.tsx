import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";

export const Route = createFileRoute("/_shell/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Nestly" },
      { name: "description", content: "Income, occupancy and arrears in Nestly." },
      { property: "og:title", content: "Reports — Nestly" },
      { property: "og:description", content: "Income, occupancy and arrears in Nestly." },
    ],
  }),
  component: () => <Placeholder navKey="reports" title="Portfolio" muted="reports" sub="Income, occupancy and arrears" />,
});
