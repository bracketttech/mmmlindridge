import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";

export const Route = createFileRoute("/_shell/leases")({
  head: () => ({
    meta: [
      { title: "Leases & documents — Nestly" },
      { name: "description", content: "Signed leases, addendums and files in Nestly." },
      { property: "og:title", content: "Leases & documents — Nestly" },
      { property: "og:description", content: "Signed leases, addendums and files in Nestly." },
    ],
  }),
  component: () => <Placeholder navKey="leases" title="Leases &" muted="documents" sub="Signed leases, addendums and files" />,
});
