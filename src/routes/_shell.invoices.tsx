import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";

export const Route = createFileRoute("/_shell/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices & payments — Nestly" },
      { name: "description", content: "Rent, statements and gateway status in Nestly." },
      { property: "og:title", content: "Invoices & payments — Nestly" },
      { property: "og:description", content: "Rent, statements and gateway status in Nestly." },
    ],
  }),
  component: () => <Placeholder navKey="invoices" title="Invoices &" muted="payments" sub="Rent, statements and gateway status" />,
});
